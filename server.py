import os
import sys
import re
import json
import shutil
import subprocess
import threading
import uuid

# Ensure UTF-8 output on Windows consoles to prevent emoji crash
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import yt_dlp
import imageio_ffmpeg

# Configure static ffmpeg
FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
FFMPEG_DIR = os.path.dirname(FFMPEG_EXE)
os.environ["PATH"] = FFMPEG_DIR + os.pathsep + os.environ.get("PATH", "")
ffmpeg_alias = os.path.join(FFMPEG_DIR, "ffmpeg.exe")
if not os.path.exists(ffmpeg_alias):
    try:
        shutil.copy(FFMPEG_EXE, ffmpeg_alias)
    except Exception as e:
        print(f"ffmpeg alias warning: {e}")

app = Flask(__name__)
CORS(app)

DOWNLOADS_DIR = os.path.join(os.path.dirname(__file__), "public", "downloads")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

def format_ass_time(seconds):
    seconds = max(0.0, float(seconds))
    hours = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centis = int(round((seconds - int(seconds)) * 100))
    if centis >= 100:
        secs += 1
        centis = 0
    return f"{hours}:{mins:02d}:{secs:02d}.{centis:02d}"

def wrap_text_lines(text, max_chars=22):
    words = text.strip().split()
    if not words:
        return ""
    lines = []
    current_line = []
    current_len = 0
    for w in words:
        if current_len + len(w) + (1 if current_line else 0) <= max_chars:
            current_line.append(w)
            current_len += len(w) + (1 if len(current_line) > 1 else 0)
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [w]
            current_len = len(w)
    if current_line:
        lines.append(" ".join(current_line))
    return "\\N".join(lines)

def build_ass_file(start_time, end_time, headline, subtitles_raw, ass_filepath, aspect_ratio="9:16"):
    """Generates an ASS subtitle file formatted for 9:16, 1:1, or 16:9 video with Hormozi style."""
    duration = max(1.0, end_time - start_time)

    if aspect_ratio == "1:1":
        res_x, res_y = 1080, 1080
        sub_margin_v = 140
        sub_size = 54
    elif aspect_ratio == "16:9":
        res_x, res_y = 1920, 1080
        sub_margin_v = 110
        sub_size = 56
    else:  # Default 9:16 vertical short
        res_x, res_y = 1080, 1920
        sub_margin_v = 360
        sub_size = 60

    lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        f"PlayResX: {res_x}",
        f"PlayResY: {res_y}",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Subtitle,Arial,{sub_size},&H0000FFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,5,0,2,60,60,{sub_margin_v},1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"
    ]

    has_dialogues = False

    # 2. Subtitles in active window
    if subtitles_raw:
        if isinstance(subtitles_raw, list):
            for item in subtitles_raw:
                if isinstance(item, dict):
                    raw_s = float(item.get("start", item.get("startTime", 0)))
                    raw_e = float(item.get("end", item.get("endTime", raw_s + 3)))
                    text = item.get("text", "")
                else:
                    raw_s = 0
                    raw_e = duration
                    text = str(item)

                rel_s = raw_s - start_time
                rel_e = raw_e - start_time

                if rel_e > 0 and rel_s < duration and text.strip():
                    clamped_s = max(0.0, rel_s)
                    clamped_e = min(duration, rel_e)
                    if clamped_e > clamped_s:
                        wrapped_sub = wrap_text_lines(text.upper(), max_chars=22)
                        lines.append(f"Dialogue: 0,{format_ass_time(clamped_s)},{format_ass_time(clamped_e)},Subtitle,,0,0,0,,{wrapped_sub}")
                        has_dialogues = True
        elif isinstance(subtitles_raw, str) and subtitles_raw.strip():
            wrapped = wrap_text_lines(subtitles_raw.upper(), max_chars=22)
            lines.append(f"Dialogue: 0,0:00:00.00,{format_ass_time(duration)},Subtitle,,0,0,0,,{wrapped}")
            has_dialogues = True

    if not has_dialogues:
        return False

    with open(ass_filepath, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return True

WHISPER_MODEL = None
WHISPER_LOCK = threading.Lock()

def get_whisper_model():
    global WHISPER_MODEL
    with WHISPER_LOCK:
        if WHISPER_MODEL is None:
            try:
                import whisper
                WHISPER_MODEL = whisper.load_model("tiny.en")
            except Exception as e:
                print(f"Whisper load warning: {e}")
                return None
    return WHISPER_MODEL

def is_valid_transcript(trans):
    """Validates that a transcript contains actual words, not just punctuation or empty strings."""
    if not trans or not isinstance(trans, list) or len(trans) == 0:
        return False
    has_real_words = False
    for item in trans:
        txt = (item.get("text") if isinstance(item, dict) else str(item)).strip()
        cleaned = re.sub(r'^[.\s,\-!?]+$', '', txt)
        if len(cleaned) > 1:
            has_real_words = True
            break
    return has_real_words

def is_placeholder_subtitles(subs):
    """Detects whether subtitles are synthetic template phrases (like paddle, hydration, watch this play)."""
    if not subs:
        return True
    if isinstance(subs, str):
        cleaned = re.sub(r'^[.\s,\-!?]+$', '', subs).strip()
        if len(cleaned) <= 1:
            return True
        lower_s = subs.lower()
        return any(p in lower_s for p in [
            "watch this play", "paddle", "hydration", "skull", "frying pan",
            "impossible clutch", "dumbest thing", "building a bridge", "blinded by the storm",
            "moment hook intro", "action highlight peak", "high energy reaction"
        ])
    if isinstance(subs, list):
        if len(subs) == 0:
            return True
        valid_speech_count = 0
        for item in subs:
            t = (item.get("text", "") if isinstance(item, dict) else str(item)).strip()
            cleaned = re.sub(r'^[.\s,\-!?]+$', '', t)
            if not cleaned or len(cleaned) <= 1:
                continue
            lower_t = t.lower()
            if any(p in lower_t for p in [
                "watch this play", "paddle", "hydration", "skull", "frying pan",
                "impossible clutch", "dumbest thing", "building a bridge", "blinded by the storm",
                "moment hook intro", "action highlight peak", "high energy reaction"
            ]):
                return True
            valid_speech_count += 1
        return valid_speech_count == 0
    return False

def transcribe_audio_file(audio_filepath):
    """Transcribes an audio or video file with Whisper tiny.en to produce authentic word-level transcripts."""
    model = get_whisper_model()
    if not model or not os.path.exists(audio_filepath):
        return []
    try:
        res = model.transcribe(audio_filepath, fp16=False, no_speech_threshold=0.6, condition_on_previous_text=False)
        segments = res.get("segments", [])
        transcript = []
        for s in segments:
            text = s.get("text", "").strip()
            clean_text = re.sub(r'^[.\s,\-!?]+$', '', text).strip()
            if clean_text and len(clean_text) > 1:
                transcript.append({
                    "start": round(float(s.get("start", 0)), 2),
                    "end": round(float(s.get("end", 0)), 2),
                    "text": clean_text
                })
        return transcript
    except Exception as e:
        print(f"Whisper transcribe error: {e}")
        return []

def ensure_transcript_for_video(video_id, video_filepath):
    """Ensures authentic transcript JSON exists for a video_id, transcribing via Whisper if needed."""
    trans_file = os.path.join(DOWNLOADS_DIR, f"{video_id}_transcript.json")
    if os.path.exists(trans_file):
        try:
            with open(trans_file, "r", encoding="utf-8") as f:
                cached = json.load(f)
                if is_valid_transcript(cached):
                    return cached
        except Exception:
            pass

    if video_filepath and os.path.exists(video_filepath) and os.path.getsize(video_filepath) > 10000:
        t = transcribe_audio_file(video_filepath)
        if t and is_valid_transcript(t):
            try:
                with open(trans_file, "w", encoding="utf-8") as f:
                    json.dump(t, f, indent=2)
            except Exception as e:
                print(f"Failed to save transcript: {e}")
            return t
    return []


import time
import urllib.request
import xml.etree.ElementTree as ET

# In-memory cache for live creator radar (60-second TTL)
CREATOR_CACHE = {
    "data": [],
    "last_updated": 0
}

# Top English creators and streamers across Twitch, YouTube, and Kick
TRACKED_TWITCH_CREATORS = [
    {"name": "Kai Cenat", "login": "kaicenat"},
    {"name": "xQc", "login": "xqc"},
    {"name": "Jynxzi", "login": "jynxzi"},
    {"name": "CaseOh", "login": "caseoh_"},
    {"name": "Asmongold", "login": "asmongold"},
    {"name": "Tarik", "login": "tarik"},
    {"name": "HasanAbi", "login": "hasanabi"},
    {"name": "Shroud", "login": "shroud"},
    {"name": "MoistCr1TiKaL", "login": "moistcr1tikal"},
    {"name": "Summit1g", "login": "summit1g"},
    {"name": "Thebausffs", "login": "thebausffs"},
    {"name": "Elajjaz", "login": "elajjaz"},
    {"name": "Ironmouse", "login": "ironmouse"},
    {"name": "Ludwig", "login": "ludwig"},
    {"name": "Pokimane", "login": "pokimane"},
    {"name": "Kyedae", "login": "kyedae"},
    {"name": "Lacy", "login": "lacy"},
    {"name": "Plaqueboymax", "login": "plaqueboymax"},
    {"name": "Fanum", "login": "fanum"},
    {"name": "Agent00", "login": "agent00"},
    {"name": "Clix", "login": "clix"},
    {"name": "Mongraal", "login": "mongraal"},
    {"name": "DisguisedToast", "login": "disguisedtoast"},
    {"name": "Bananabrea", "login": "bananabrea"}
]

TRACKED_YOUTUBE_CREATORS = [
    {"name": "IShowSpeed", "channel_id": "UCWsDFcIhY2DBi3GB5uykGXA", "handle": "@IShowSpeed"},
    {"name": "MrBeast", "channel_id": "UCX6OQ3DkcsbYNE6H8uQQuVA", "handle": "@MrBeast"},
    {"name": "Marques Brownlee", "channel_id": "UCBJycsmduvYEL83R_U4JriQ", "handle": "@mkbhd"},
    {"name": "Lex Fridman", "channel_id": "UCSHZKyawb77ixDdsGog4iWA", "handle": "@lexfridman"},
    {"name": "Joe Rogan Experience", "channel_id": "UCzQUP1qoWDoEbmsQxvdjxgQ", "handle": "@joerogan"},
    {"name": "Penguinz0", "channel_id": "UCq6VxhLsX5nIT44v79dY1Aw", "handle": "@penguinz0"},
    {"name": "PewDiePie", "channel_id": "UC-lHJZR3Gqxm24_Vd_AJ5Yw", "handle": "@PewDiePie"}
]

def fetch_live_twitch_data():
    """Fetches real-time live viewer counts, stream titles, and recent VODs for Twitch creators."""
    results = []
    url = "https://gql.twitch.tv/gql"
    
    # 1. Batch query tracked creator channels
    payload = []
    for c in TRACKED_TWITCH_CREATORS:
        payload.append({
            "operationName": "ChannelShell",
            "variables": {"login": c["login"]},
            "query": """query ChannelShell($login: String!) {
                user(login: $login) {
                    id
                    login
                    displayName
                    profileImageURL(width: 300)
                    stream {
                        id
                        title
                        viewersCount
                        createdAt
                        game { name }
                    }
                    videos(first: 1, sort: TIME) {
                        edges {
                            node {
                                id
                                title
                                lengthSeconds
                                publishedAt
                                viewCount
                            }
                        }
                    }
                }
            }"""
        })
    
    # 2. Also query top streams on Twitch directory with freeformTags to filter for English
    payload.append({
        "query": """{
            streams(first: 35) {
                edges {
                    node {
                        id
                        title
                        viewersCount
                        game { name }
                        freeformTags { name }
                        broadcaster {
                            displayName
                            login
                            profileImageURL(width: 300)
                        }
                    }
                }
            }
        }"""
    })

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Client-Id": "kimne78kx3ncx6brgo4mv6wki5h1ko",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
    )

    seen_logins = set()

    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            
            # Process tracked creators
            for item in data[:-1]:
                u = item.get("data", {}).get("user")
                if not u:
                    continue
                login = u.get("login")
                if not login or login in seen_logins:
                    continue
                seen_logins.add(login)

                stream = u.get("stream")
                recent_vods = u.get("videos", {}).get("edges", [])
                vod = recent_vods[0]["node"] if recent_vods else None

                if stream:
                    viewers = stream.get("viewersCount", 0)
                    stream_url = f"https://www.twitch.tv/videos/{vod.get('id')}" if (vod and vod.get("id")) else f"https://www.twitch.tv/{login}"
                    results.append({
                        "id": f"twitch-{login}",
                        "creator": u.get("displayName", login),
                        "handle": f"@{login}",
                        "platform": "twitch",
                        "isLive": True,
                        "viewersCount": viewers,
                        "popularityScore": viewers,
                        "title": stream.get("title", "Live Stream"),
                        "category": stream.get("game", {}).get("name") if stream.get("game") else "Streaming",
                        "avatar": u.get("profileImageURL", f"https://unavatar.io/twitch/{login}"),
                        "url": stream_url,
                        "thumbnail": f"https://static-cdn.jtvnw.net/previews-ttv/live_user_{login}-640x360.jpg",
                        "statusText": f"🔴 LIVE NOW ({viewers:,} viewers)",
                        "badge": "LIVE"
                    })
                elif vod:
                    views = vod.get("viewCount", 0)
                    secs = vod.get("lengthSeconds", 0)
                    duration_text = f"{secs // 60}m" if secs else "VOD"
                    results.append({
                        "id": f"twitch-vod-{vod.get('id')}",
                        "creator": u.get("displayName", login),
                        "handle": f"@{login}",
                        "platform": "twitch",
                        "isLive": False,
                        "viewersCount": views,
                        "popularityScore": max(100, views // 50),
                        "title": vod.get("title", f"{u.get('displayName')} Stream Archive"),
                        "category": "Stream Archive",
                        "avatar": u.get("profileImageURL", f"https://unavatar.io/twitch/{login}"),
                        "url": f"https://www.twitch.tv/videos/{vod.get('id')}",
                        "thumbnail": u.get("profileImageURL", ""),
                        "duration": secs,
                        "statusText": f"📹 Recent VOD ({duration_text} · {views:,} views)",
                        "badge": "VOD"
                    })

            # Process top directory streams, filtering for English broadcasters
            dir_streams = data[-1].get("data", {}).get("streams", {}).get("edges", [])
            for s in dir_streams:
                node = s.get("node")
                if not node:
                    continue
                bc = node.get("broadcaster", {})
                b_login = bc.get("login")
                if not b_login or b_login in seen_logins:
                    continue

                # Filter strictly for English streams
                tags = [t.get("name", "").lower() for t in node.get("freeformTags", [])]
                is_english = any("english" in t or t == "en" for t in tags)
                if not is_english:
                    continue

                seen_logins.add(b_login)
                viewers = node.get("viewersCount", 0)
                results.append({
                    "id": f"twitch-top-{b_login}",
                    "creator": bc.get("displayName", b_login),
                    "handle": f"@{b_login}",
                    "platform": "twitch",
                    "isLive": True,
                    "viewersCount": viewers,
                    "popularityScore": viewers,
                    "title": node.get("title", "Live Stream"),
                    "category": node.get("game", {}).get("name") if node.get("game") else "Top Live Stream",
                    "avatar": bc.get("profileImageURL", f"https://unavatar.io/twitch/{b_login}"),
                    "url": f"https://www.twitch.tv/{b_login}",
                    "thumbnail": f"https://static-cdn.jtvnw.net/previews-ttv/live_user_{b_login}-640x360.jpg",
                    "statusText": f"🔴 LIVE NOW ({viewers:,} viewers)",
                    "badge": "TOP STREAM"
                })
    except Exception as e:
        print(f"Twitch GQL fetch error: {e}")

    return results

def fetch_live_youtube_data():
    """Fetches recently uploaded videos and live status for top English creators via public RSS."""
    results = []
    ns = {
        "atom": "http://www.w3.org/2005/Atom",
        "yt": "http://www.youtube.com/xml/schemas/2015",
        "media": "http://search.yahoo.com/mrss/"
    }

    for c in TRACKED_YOUTUBE_CREATORS:
        rss_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={c['channel_id']}"
        try:
            req = urllib.request.Request(rss_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                xml_data = resp.read()
                root = ET.fromstring(xml_data)
                entries = root.findall("atom:entry", ns)
                if entries:
                    e = entries[0]
                    title = e.find("atom:title", ns).text if e.find("atom:title", ns) is not None else "Latest Video"
                    link = e.find("atom:link", ns).attrib.get("href") if e.find("atom:link", ns) is not None else ""
                    pub = e.find("atom:published", ns).text if e.find("atom:published", ns) is not None else ""
                    video_id_el = e.find("yt:videoId", ns)
                    video_id = video_id_el.text if video_id_el is not None else ""
                    
                    clean_handle = c["handle"].replace("@", "")
                    avatar = f"https://unavatar.io/youtube/{clean_handle}"
                    thumb = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg" if video_id else avatar

                    # Estimate recency
                    pub_date = pub[:10] if pub else "Recent"
                    results.append({
                        "id": f"yt-{video_id or clean_handle}",
                        "creator": c["name"],
                        "handle": c["handle"],
                        "platform": "youtube",
                        "isLive": False,
                        "viewersCount": 150000,
                        "popularityScore": 12000,
                        "title": title,
                        "category": "YouTube Creator",
                        "avatar": avatar,
                        "url": link or f"https://www.youtube.com/watch?v=s{video_id}",
                        "thumbnail": thumb,
                        "statusText": f"🆕 Uploaded {pub_date}",
                        "badge": "NEW VIDEO"
                    })
        except Exception as e:
            print(f"YouTube RSS error for {c['name']}: {e}")

    return results

def get_ranked_creators(force_refresh=False):
    """Returns top streamers & creators ranked by live popularity with in-memory caching."""
    global CREATOR_CACHE
    now = time.time()

    # Low 15s cache TTL for real-time live popularity updates
    if not force_refresh and CREATOR_CACHE["data"] and (now - CREATOR_CACHE["last_updated"] < 15):
        return CREATOR_CACHE["data"]

    twitch_list = fetch_live_twitch_data()
    yt_list = fetch_live_youtube_data()
    
    # Combined list
    combined = twitch_list + yt_list

    # Rank: Live streams first ordered by live viewer count descending, then recent uploads
    combined.sort(
        key=lambda x: (
            1 if x.get("isLive") else 0,
            x.get("viewersCount", 0) if x.get("isLive") else x.get("popularityScore", 0)
        ),
        reverse=True
    )

    CREATOR_CACHE["data"] = combined
    CREATOR_CACHE["last_updated"] = now
    return combined

def select_best_streams(formats):
    """
    Selects clean video and audio streams:
    - Prioritizes direct mp4/m4a candidate streams for VODs.
    - Gracefully handles m3u8_native streams for live broadcasts (IShowSpeed, Twitch, etc.).
    - Strictly ensures best_v has a REAL video codec (never audio-only!).
    """
    if not formats:
        return None, None

    # 1. Video candidates (must have real video codec, never 'none')
    v_candidates = [
        f for f in formats 
        if f.get("vcodec") and f.get("vcodec") != "none" and f.get("url")
    ]

    best_v = None
    if v_candidates:
        # Prefer HTTPS if available, otherwise use m3u8 live formats
        v_https = [f for f in v_candidates if f.get("protocol") == "https" and f.get("acodec") == "none"]
        pool_v = v_https if v_https else v_candidates
        v_1080 = [f for f in pool_v if (f.get("height") or 0) <= 1080 and (f.get("height") or 0) > 0]
        if v_1080:
            best_v = max(v_1080, key=lambda f: (f.get("height") or 0, f.get("tbr") or 0))
        else:
            best_v = max(pool_v, key=lambda f: (f.get("height") or 0, f.get("tbr") or 0))

    # 2. Audio candidates (must have audio, no video)
    a_candidates = [
        f for f in formats
        if (f.get("acodec") != "none" or f.get("resolution") == "audio only")
        and f.get("vcodec") == "none"
        and f.get("url")
    ]

    def audio_score(f):
        score = 0
        note = (f.get("format_note") or "").lower()
        lang = (f.get("language") or "").lower()
        ext = f.get("ext") or ""
        proto = f.get("protocol") or ""
        abr = f.get("abr") or f.get("tbr") or 0

        if proto == "https":
            score += 1000
        if "original" in note or "default" in note:
            score += 500
        if lang in ("en", "eng", ""):
            score += 300
        if ext == "m4a":
            score += 200
        score += min(200, int(abr))
        return score

    best_a = max(a_candidates, key=audio_score) if a_candidates else None

    # 3. Fallback to combined video+audio formats (Twitch, Kick, single file) if either is missing
    if not best_v or not best_a:
        combined = [
            f for f in formats
            if f.get("vcodec") and f.get("vcodec") != "none"
            and f.get("acodec") and f.get("acodec") != "none"
            and f.get("url")
        ]
        if combined:
            combined_720 = [f for f in combined if (f.get("height") or 0) <= 1080 and (f.get("height") or 0) > 0]
            chosen = max(combined_720, key=lambda f: (f.get("height") or 0, f.get("tbr") or 0)) if combined_720 else combined[0]
            if not best_v:
                best_v = chosen
            if not best_a:
                best_a = chosen

    # Final sanity check: best_v MUST have real video
    if best_v and (not best_v.get("vcodec") or best_v.get("vcodec") == "none"):
        best_v = None

    return best_v, best_a

def extract_real_subtitles(info):
    """Extracts authentic speech transcripts from video metadata (YouTube, etc.)."""
    auto_caps = info.get("automatic_captions", {}) or {}
    subs = info.get("subtitles", {}) or {}
    en_caps = auto_caps.get("en") or subs.get("en") or auto_caps.get("en-US") or subs.get("en-US")
    if not en_caps:
        return []

    json3_url = next((c.get("url") for c in en_caps if c.get("ext") == "json3"), None)
    if not json3_url:
        json3_url = next((c.get("url") for c in en_caps if c.get("url")), None)

    if not json3_url:
        return []

    try:
        req = urllib.request.Request(json3_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            events = data.get("events", [])
            transcript = []
            for ev in events:
                t_start = round(ev.get("tStartMs", 0) / 1000, 2)
                d_ms = ev.get("dDurationMs", 2000)
                t_end = round((ev.get("tStartMs", 0) + d_ms) / 1000, 2)
                segs = ev.get("segs", [])
                text = "".join(s.get("utf8", "") for s in segs).replace("\n", " ").strip()
                if text and text != "\n" and len(text) > 1:
                    transcript.append({
                        "start": t_start,
                        "end": t_end,
                        "text": text
                    })
            return transcript
    except Exception as e:
        print(f"Real subtitle fetch warning: {e}")
        return []

def get_stream_action_start(duration, is_live):
    """
    Determines the ideal start timestamp for a stream or video:
    - If currently live broadcast: skip past the initial 60s stream connection buffer
    - If long VOD/stream (> 15 mins): skip past the intro / 'Stream Starting Soon' title card (typically 10-20 mins in)
    - If medium video (3-15 mins): skip the 15-30s intro hook
    - If short video (< 3 mins): start at 0
    """
    if is_live:
        return 60.0 if duration >= 300 else 0.0

    if duration >= 7200:  # 2+ hours stream (e.g. Kai Cenat 7h stream)
        return min(1200.0, duration * 0.15)
    elif duration >= 1800:  # 30 mins to 2 hours
        return min(600.0, duration * 0.15)
    elif duration >= 600:  # 10 to 30 mins
        return min(120.0, duration * 0.1)
    elif duration >= 120:  # 2 to 10 mins
        return 15.0
    return 0.0

def resolve_twitch_channel_vod(channel_name):
    """
    Checks if a Twitch channel has an active or recent broadcast VOD.
    Twitch broadcast VODs are available in real-time on CloudFront CDN with:
    - ZERO preroll ads / commercial break cards
    - Sample-accurate seeking to stream action
    - Crystal-clear audio with 100% synchronized streamer speech
    """
    try:
        clean_name = channel_name.lower().strip("/").split("/")[-1].split("?")[0]
        query = 'query { user(login: "%s") { videos(first: 1, sort: TIME) { edges { node { id title lengthSeconds } } } } }' % clean_name
        req = urllib.request.Request(
            "https://gql.twitch.tv/gql",
            data=json.dumps({"query": query}).encode("utf-8"),
            headers={
                "Client-Id": "kimne78kx3ncx6brgo4mv6wki5h1ko",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            edges = data.get("data", {}).get("user", {}).get("videos", {}).get("edges", [])
            if edges:
                vod_node = edges[0].get("node", {})
                vod_id = vod_node.get("id")
                if vod_id:
                    print(f"Resolved Twitch channel '{clean_name}' to real-time ad-free VOD https://www.twitch.tv/videos/{vod_id}")
                    return f"https://www.twitch.tv/videos/{vod_id}"
    except Exception as e:
        print(f"Twitch VOD resolve fallback: {e}")
    return None

STREAM_CACHE = {}
HEATMAP_CACHE = {}

def extract_direct_streams(url, return_action_start=False, return_is_live=False):
    """Extracts direct CDN video and audio stream URLs using yt-dlp with in-memory caching."""
    now = time.time()
    if url in STREAM_CACHE and (now - STREAM_CACHE[url]["ts"] < 3600):
        cached_data = STREAM_CACHE[url]["data"]
        if return_is_live:
            return cached_data
        if return_action_start:
            return cached_data[:9]
        return cached_data[:8]

    # For Twitch channel URLs, automatically resolve to their ongoing broadcast VOD to guarantee zero ads and action seeking
    if "twitch.tv" in url and "/videos/" not in url and "/clip/" not in url:
        channel_name = url.split("twitch.tv/")[-1].split("/")[0].split("?")[0]
        vod_url = resolve_twitch_channel_vod(channel_name)
        if vod_url:
            url = vod_url

    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "ffmpeg_location": FFMPEG_DIR,
        "extractor_args": {
            "twitch": {
                "disable_ads": ["true"]
            }
        }
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        video_id = str(info.get("id", "stream_video"))
        heatmap = info.get("heatmap") or []
        if heatmap:
            HEATMAP_CACHE[video_id] = heatmap
        title = info.get("title") or "Live Stream Highlight"
        is_live = bool(info.get("is_live") or info.get("live_status") == "is_live" or ("m3u8" in str(info.get("url", "")) and "index-dvr" not in str(info.get("url", ""))))
        raw_dur = float(info.get("duration") or 0)
        action_start = get_stream_action_start(raw_dur, is_live)
        # For live streams, assign a 2400s (40 min) broadcast window if duration is unknown, ensuring non-contiguous clips
        if is_live:
            duration = raw_dur if (raw_dur and raw_dur > 300) else 2400.0
        else:
            duration = raw_dur if (raw_dur and raw_dur > 0) else 60.0
        thumbnail = info.get("thumbnail")
        uploader = info.get("uploader") or info.get("channel") or "Popular Streamer"
        formats = info.get("formats", [])

        best_v, best_a = select_best_streams(formats)

        v_url = best_v.get("url") if best_v else None
        a_url = best_a.get("url") if best_a else None

        # Extract authentic captions if present
        real_transcript = extract_real_subtitles(info)
        if not real_transcript:
            trans_file = os.path.join(DOWNLOADS_DIR, f"{video_id}_transcript.json")
            if os.path.exists(trans_file):
                try:
                    with open(trans_file, "r", encoding="utf-8") as f:
                        cached = json.load(f)
                        if is_valid_transcript(cached):
                            real_transcript = cached
                except Exception:
                    pass

        res_data = (video_id, title, duration, thumbnail, uploader, v_url, a_url, real_transcript, action_start, is_live)
        STREAM_CACHE[url] = {"data": res_data, "ts": now}

        if return_is_live:
            return res_data
        if return_action_start:
            return res_data[:9]
        return res_data[:8]



@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "vizard-stream-service",
        "ffmpeg": os.path.exists(FFMPEG_EXE),
        "trackedCreators": len(TRACKED_TWITCH_CREATORS) + len(TRACKED_YOUTUBE_CREATORS)
    })

@app.route("/api/creators/live", methods=["GET"])
def get_live_creators():
    """Returns top English streamers and creators ranked by live popularity."""
    force_refresh = request.args.get("refresh", "").lower() in ("1", "true")
    creators = get_ranked_creators(force_refresh=force_refresh)
    live_count = sum(1 for c in creators if c.get("isLive"))
    return jsonify({
        "success": True,
        "total": len(creators),
        "totalLive": live_count,
        "updatedAt": CREATOR_CACHE.get("last_updated"),
        "creators": creators
    })

@app.route("/api/creators/search", methods=["GET"])
def search_creators():
    """Searches live creators or checks a custom streamer handle/channel URL."""
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify({"success": True, "creators": get_ranked_creators()})

    creators = get_ranked_creators()
    lower_q = q.lower()
    matched = [
        c for c in creators
        if lower_q in c["creator"].lower()
        or lower_q in c["handle"].lower()
        or lower_q in c["title"].lower()
        or lower_q in c["category"].lower()
    ]
    return jsonify({"success": True, "query": q, "total": len(matched), "creators": matched})

@app.route("/api/creators/shorts_meta", methods=["POST"])
def generate_shorts_metadata():
    """Generates viral YouTube Shorts title, description, and hashtags for a creator video."""
    data = request.get_json(force=True, silent=True) or {}
    creator = data.get("creator", "Creator")
    raw_title = data.get("title", "Insane Stream Moment")
    platform = data.get("platform", "Twitch")

    clean_creator = "".join(c for c in creator if c.isalnum())
    shorts_title = f"{creator}: {raw_title[:45]} 🤯 #Shorts"
    description = (
        f"Watch {creator} in this incredible moment! Cut into high-energy viral shorts.\n\n"
        f"🔴 Original Platform: {platform.title()}\n"
        f"✨ Auto-edited & captioned with Vizard AI\n\n"
        f"#Shorts #YouTubeShorts #{clean_creator} #Trending #ViralClips #StreamerMoments"
    )
    tags = ["Shorts", "YouTube Shorts", creator, clean_creator, "Viral", "Clips", "Stream Highlights", platform]

    return jsonify({
        "success": True,
        "shortsTitle": shorts_title,
        "description": description,
        "tags": tags,
        "hashtagsString": f"#Shorts #YouTubeShorts #{clean_creator} #Trending #Viral"
    })

@app.route("/api/video_info", methods=["GET", "POST"])
def video_info():
    """Universal video & stream metadata endpoint (YouTube, Twitch, Kick, etc.)"""
    return process_youtube()


@app.route("/downloads/<path:filename>", methods=["GET", "OPTIONS"])
def serve_download(filename):
    response = send_from_directory(DOWNLOADS_DIR, filename, conditional=True)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Accept-Ranges"] = "bytes"
    return response

PREVIEW_LOCK = threading.Lock()
ACTIVE_PREVIEWS = set()

def background_download_preview(url, video_id):
    target_id = video_id
    if not target_id and url:
        try:
            target_id, _, _, _, _, _, _, _ = extract_direct_streams(url)
        except Exception:
            return

    if not target_id:
        return

    with PREVIEW_LOCK:
        if target_id in ACTIVE_PREVIEWS:
            return
        ACTIVE_PREVIEWS.add(target_id)

    tmp_output = os.path.join(DOWNLOADS_DIR, f"{target_id}_preview_{uuid.uuid4().hex[:6]}.mp4")
    preview_output = os.path.join(DOWNLOADS_DIR, f"{target_id}_preview.mp4")

    try:
        if os.path.exists(preview_output) and os.path.getsize(preview_output) > 50000:
            ensure_transcript_for_video(target_id, preview_output)
            return

        real_video_id, _, duration, _, _, v_url, a_url, _, action_start = extract_direct_streams(url, return_action_start=True)
        if not real_video_id:
            return

        if v_url:
            print(f"Capturing stream preview for {target_id} starting at {action_start}s...")
            cmd = [
                FFMPEG_EXE,
                "-y",
                "-fflags", "+genpts+discardcorrupt",
                "-ss", str(action_start),
                "-i", v_url
            ]
            if a_url and a_url != v_url:
                cmd.extend([
                    "-ss", str(action_start),
                    "-i", a_url
                ])
            cmd.extend([
                "-t", "60",
                "-vf", "setsar=1,scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,setsar=1,setdar=9/16,setpts=PTS-STARTPTS",
                "-af", "aresample=async=1:first_pts=0,asetpts=PTS-STARTPTS",
                "-fps_mode", "cfr",
                "-r", "30",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "23",
                "-aspect", "9:16",
                "-c:a", "aac",
                "-b:a", "320k",
                "-ar", "48000",
                "-shortest",
                tmp_output
            ])
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0 and os.path.exists(tmp_output) and os.path.getsize(tmp_output) > 20000:
                if os.path.exists(preview_output):
                    try:
                        os.remove(preview_output)
                    except Exception:
                        pass
                os.replace(tmp_output, preview_output)
                print(f"Generated preview video: {preview_output}")
                ensure_transcript_for_video(target_id, preview_output)

                if real_video_id and target_id != real_video_id:
                    alias_output = os.path.join(DOWNLOADS_DIR, f"{real_video_id}_preview.mp4")
                    if not os.path.exists(alias_output) and os.path.exists(preview_output):
                        try:
                            shutil.copy(preview_output, alias_output)
                        except Exception:
                            pass
                    alias_trans = os.path.join(DOWNLOADS_DIR, f"{real_video_id}_transcript.json")
                    orig_trans = os.path.join(DOWNLOADS_DIR, f"{target_id}_transcript.json")
                    if not os.path.exists(alias_trans) and os.path.exists(orig_trans):
                        try:
                            shutil.copy(orig_trans, alias_trans)
                        except Exception:
                            pass
            elif res.returncode != 0:
                print(f"FFmpeg preview capture error: {res.stderr[-300:]}")
    except Exception as e:
        print(f"Background preview error for {target_id}: {e}")
    finally:
        if os.path.exists(tmp_output):
            try:
                os.remove(tmp_output)
            except Exception:
                pass
        with PREVIEW_LOCK:
            ACTIVE_PREVIEWS.discard(target_id)


@app.route("/api/youtube", methods=["GET", "POST"])
def process_youtube():
    if request.method == "GET":
        url = request.args.get("url", "").strip()
    else:
        data = request.get_json(force=True, silent=True) or {}
        url = data.get("url") or request.form.get("url", "").strip()

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    print(f"Processing YouTube URL: {url}")

    try:
        video_id, title, duration, thumbnail, uploader, v_url, a_url, transcript, action_start, is_live = extract_direct_streams(url, return_is_live=True)

        preview_filename = f"{video_id}_preview.mp4"
        preview_filepath = os.path.join(DOWNLOADS_DIR, preview_filename)
        preview_url = f"http://127.0.0.1:5001/downloads/{preview_filename}"
        is_ready = os.path.exists(preview_filepath) and os.path.getsize(preview_filepath) > 10000

        if is_ready and not transcript:
            transcript = ensure_transcript_for_video(video_id, preview_filepath)

        if not is_ready:
            threading.Thread(target=background_download_preview, args=(url, video_id), daemon=True).start()

        return jsonify({
            "success": True,
            "videoId": video_id,
            "title": title,
            "duration": duration,
            "isLive": is_live,
            "thumbnail": thumbnail,
            "uploader": uploader,
            "streamUrl": preview_url if is_ready else None,
            "previewUrl": preview_url,
            "isReady": is_ready,
            "transcript": transcript or [],
            "heatmap": HEATMAP_CACHE.get(video_id, [])
        })

    except Exception as e:
        print(f"Error extracting video: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/get_clip_media", methods=["GET", "POST"])
def get_clip_media():
    """Returns direct playable preview MP4 and authentic transcript for a video/stream."""
    if request.method == "GET":
        url = request.args.get("url", "").strip()
        video_id = request.args.get("videoId", "").strip()
    else:
        data = request.get_json(force=True, silent=True) or {}
        url = data.get("url", "").strip()
        video_id = data.get("videoId", "").strip()

    if not video_id and url:
        try:
            video_id, _, _, _, _, _, _, _ = extract_direct_streams(url)
        except Exception:
            pass

    if video_id:
        preview_filename = f"{video_id}_preview.mp4"
        preview_filepath = os.path.join(DOWNLOADS_DIR, preview_filename)
        is_ready = os.path.exists(preview_filepath) and os.path.getsize(preview_filepath) > 10000

        # Also check if any rendered cut clip exists for this video_id
        if not is_ready:
            try:
                for f in os.listdir(DOWNLOADS_DIR):
                    if f.startswith(f"{video_id}_") and f.endswith(".mp4") and os.path.getsize(os.path.join(DOWNLOADS_DIR, f)) > 10000:
                        preview_filename = f
                        preview_filepath = os.path.join(DOWNLOADS_DIR, f)
                        is_ready = True
                        break
            except Exception:
                pass

        if not is_ready and url:
            threading.Thread(target=background_download_preview, args=(url, video_id), daemon=True).start()

        transcript = ensure_transcript_for_video(video_id, preview_filepath) if is_ready else []

        return jsonify({
            "success": True,
            "videoId": video_id,
            "ready": is_ready,
            "videoUrl": f"http://127.0.0.1:5001/downloads/{preview_filename}" if is_ready else None,
            "transcript": transcript or []
        })


    return jsonify({"success": False, "error": "Could not identify video"}), 400

CLIP_RENDER_LOCK = threading.Lock()
ACTIVE_CLIP_EVENTS = {}

@app.route("/api/clip_preview", methods=["GET", "OPTIONS"])
def get_clip_preview():
    if request.method == "OPTIONS":
        res = jsonify({"status": "ok"})
        res.headers["Access-Control-Allow-Origin"] = "*"
        res.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        res.headers["Access-Control-Allow-Headers"] = "*"
        return res

    url = request.args.get("url", "").strip()
    video_id = request.args.get("videoId", "").strip()
    start_time = float(request.args.get("startTime", 0))
    end_time = float(request.args.get("endTime", start_time + 30))
    aspect_ratio = request.args.get("aspectRatio", "9:16")

    # If video_id not given but url is, extract it
    if not video_id and url:
        try:
            video_id, _, _, _, _, _, _, _ = extract_direct_streams(url)
        except Exception:
            pass

    target_id = video_id or "clip"
    clip_filename = f"{target_id}_{int(start_time)}_{int(end_time)}_preview.mp4"
    clip_filepath = os.path.join(DOWNLOADS_DIR, clip_filename)

    # Return immediately if already cut and verified
    if os.path.exists(clip_filepath) and os.path.getsize(clip_filepath) > 20000:
        response = send_from_directory(DOWNLOADS_DIR, clip_filename, conditional=True, as_attachment=False, mimetype="video/mp4")
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Accept-Ranges"] = "bytes"
        return response

    # Concurrency control: wait if another thread is currently rendering this exact clip
    render_event = None
    is_initiator = False
    with CLIP_RENDER_LOCK:
        if clip_filename in ACTIVE_CLIP_EVENTS:
            render_event = ACTIVE_CLIP_EVENTS[clip_filename]
        else:
            render_event = threading.Event()
            ACTIVE_CLIP_EVENTS[clip_filename] = render_event
            is_initiator = True

    if not is_initiator:
        # Wait for the initiator thread to complete
        render_event.wait(timeout=25)
        if os.path.exists(clip_filepath) and os.path.getsize(clip_filepath) > 20000:
            response = send_from_directory(DOWNLOADS_DIR, clip_filename, conditional=True, as_attachment=False, mimetype="video/mp4")
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Accept-Ranges"] = "bytes"
            return response

    try:
        # Check if a master preview exists
        master_preview = os.path.join(DOWNLOADS_DIR, f"{target_id}_preview.mp4")

        # If stream URL available, extract authentic streams
        v_url = None
        a_url = None
        if url:
            try:
                _, _, _, _, _, ext_v, ext_a, _ = extract_direct_streams(url)
                v_url = ext_v
                a_url = ext_a
            except Exception as e:
                print(f"Clip preview extraction error: {e}")

        # Check if master preview can cover this time range (e.g. if start_time is within first 60s)
        if not v_url and os.path.exists(master_preview) and os.path.getsize(master_preview) > 20000:
            if end_time <= 60.0:
                v_url = master_preview
                a_url = master_preview

        if not v_url:
            if end_time <= 60.0 and os.path.exists(master_preview) and os.path.getsize(master_preview) > 10000:
                response = send_from_directory(DOWNLOADS_DIR, f"{target_id}_preview.mp4", conditional=True, as_attachment=False, mimetype="video/mp4")
                response.headers["Access-Control-Allow-Origin"] = "*"
                response.headers["Accept-Ranges"] = "bytes"
                return response
            return jsonify({"error": "Stream media not ready"}), 404

        tmp_token = uuid.uuid4().hex[:8]
        tmp_output = os.path.join(DOWNLOADS_DIR, f"{target_id}_{int(start_time)}_{int(end_time)}_{tmp_token}.mp4")
        dur = max(5.0, min(60.0, end_time - start_time))
        fast_seek = max(0.0, start_time - 3.0)
        accurate_offset = start_time - fast_seek

        # Fast 9:16 vertical render (540x960 for snappy preview playback in UI)
        cmd = [
            FFMPEG_EXE,
            "-y",
            "-fflags", "+genpts+discardcorrupt",
            "-thread_queue_size", "2048",
            "-probesize", "16M",
            "-analyzeduration", "10M",
            "-ss", str(fast_seek),
            "-i", v_url
        ]
        if a_url and a_url != v_url:
            cmd.extend([
                "-thread_queue_size", "2048",
                "-probesize", "16M",
                "-analyzeduration", "10M",
                "-ss", str(fast_seek),
                "-i", a_url
            ])
        cmd.extend([
            "-ss", str(accurate_offset),
            "-t", str(dur),
            "-vf", "setsar=1,scale=540:960:force_original_aspect_ratio=increase:flags=bicubic,crop=540:960,setsar=1,setdar=9/16,setpts=PTS-STARTPTS",
            "-af", "aresample=async=1:first_pts=0,asetpts=PTS-STARTPTS",
            "-fps_mode", "cfr",
            "-r", "30",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "24",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            "-shortest",
            tmp_output
        ])

        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            if res.returncode == 0 and os.path.exists(tmp_output) and os.path.getsize(tmp_output) > 10000:
                if os.path.exists(clip_filepath):
                    try:
                        os.remove(clip_filepath)
                    except Exception:
                        pass
                os.replace(tmp_output, clip_filepath)
                response = send_from_directory(DOWNLOADS_DIR, clip_filename, conditional=True, as_attachment=False, mimetype="video/mp4")
                response.headers["Access-Control-Allow-Origin"] = "*"
                response.headers["Accept-Ranges"] = "bytes"
                return response
            elif res.returncode != 0:
                print(f"FFmpeg preview cut failed (code {res.returncode}): {res.stderr[-200:]}")
        except Exception as e:
            print(f"Error cutting clip preview: {e}")
        finally:
            if os.path.exists(tmp_output):
                try:
                    os.remove(tmp_output)
                except Exception:
                    pass

        # Only fall back to master preview IF the requested clip is actually inside the master preview window (< 60s)
        if end_time <= 60.0 and os.path.exists(master_preview) and os.path.getsize(master_preview) > 10000:
            response = send_from_directory(DOWNLOADS_DIR, f"{target_id}_preview.mp4", conditional=True, as_attachment=False, mimetype="video/mp4")
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Accept-Ranges"] = "bytes"
            return response

        return jsonify({"error": "Failed to cut clip preview at requested timeline"}), 500
    finally:
        with CLIP_RENDER_LOCK:
            if clip_filename in ACTIVE_CLIP_EVENTS:
                ACTIVE_CLIP_EVENTS[clip_filename].set()
                del ACTIVE_CLIP_EVENTS[clip_filename]


@app.route("/api/download_clip", methods=["GET", "POST", "HEAD"])
def download_clip():
    subtitles = None
    headline = None
    video_id = ""
    preview_url = ""

    if request.method in ("GET", "HEAD"):
        url = request.args.get("url", "").strip()
        video_id = request.args.get("videoId", "").strip()
        preview_url = request.args.get("previewUrl", "").strip()
        start_time = float(request.args.get("startTime", 0))
        end_time = float(request.args.get("endTime", start_time + 15))
        aspect_ratio = request.args.get("aspectRatio", "9:16")
        title = request.args.get("title", "vizard_clip")
        headline = request.args.get("headline", "")
        raw_sub = request.args.get("subtitles")
        if raw_sub:
            try:
                subtitles = json.loads(raw_sub)
            except Exception:
                subtitles = raw_sub
    else:
        data = request.get_json(force=True, silent=True) or {}
        url = data.get("url", "").strip()
        video_id = data.get("videoId", "").strip()
        preview_url = data.get("previewUrl", "").strip()
        start_time = float(data.get("startTime", 0))
        end_time = float(data.get("endTime", start_time + 15))
        aspect_ratio = data.get("aspectRatio", "9:16")
        title = data.get("title", "vizard_clip")
        headline = data.get("headline", "")
        subtitles = data.get("subtitles")

    if not url and not video_id and not preview_url:
        return jsonify({"error": "No video source provided"}), 400

    duration = max(1.0, end_time - start_time)
    clean_title = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in title).strip("_") or "clip"

    # Identify video_id and extract authentic online streams if URL provided
    v_url = None
    a_url = None
    local_source = None

    if url and os.path.exists(url) and not url.startswith("http"):
        local_source = url
        v_url = url
        a_url = url
    else:
        # Online video source (YouTube, Twitch, Kick, etc.)
        effective_url = url
        if not effective_url and video_id:
            effective_url = f"https://www.youtube.com/watch?v={video_id}"

        if effective_url:
            try:
                extracted_id, _, _, _, _, ext_v, ext_a, ext_trans = extract_direct_streams(effective_url)
                if not video_id:
                    video_id = extracted_id
                v_url = ext_v
                a_url = ext_a
                if not subtitles and ext_trans:
                    subtitles = ext_trans
            except Exception as e:
                print(f"Direct stream extraction error: {e}")

    # Fallback to local files if stream extraction failed
    if not v_url:
        if preview_url and "/downloads/" in preview_url:
            cand = os.path.join(DOWNLOADS_DIR, preview_url.split("/downloads/")[-1])
            if os.path.exists(cand) and os.path.getsize(cand) > 10000:
                local_source = cand
                v_url = cand
                a_url = cand

        if not v_url and video_id:
            cand = os.path.join(DOWNLOADS_DIR, f"{video_id}_preview.mp4")
            if os.path.exists(cand) and os.path.getsize(cand) > 10000:
                local_source = cand
                v_url = cand
                a_url = cand

    if not v_url:
        return jsonify({"error": "Could not access video stream for cutting."}), 500

    # Cache key with v5 synchronized engine tag (Shorts aspect ratio + clean dynamic subtitles)
    has_sub_tag = "sub" if subtitles else "raw"
    aspect_tag = aspect_ratio.replace(":", "")
    output_filename = f"{video_id or 'clip'}_{int(start_time)}_{int(end_time)}_{aspect_tag}_{has_sub_tag}_sync_v5.mp4"
    output_filepath = os.path.join(DOWNLOADS_DIR, output_filename)

    # Return if already cut with synchronized v5 engine
    if os.path.exists(output_filepath) and os.path.getsize(output_filepath) > 50000:
        return send_from_directory(
            DOWNLOADS_DIR,
            output_filename,
            as_attachment=True,
            download_name=f"{clean_title}_{aspect_ratio.replace(':', '-')}.mp4",
            mimetype="video/mp4"
        )

    # Clean up empty or broken previous attempts
    if os.path.exists(output_filepath) and os.path.getsize(output_filepath) <= 50000:
        try:
            os.remove(output_filepath)
        except Exception:
            pass

    # High-Definition Layout filters ensuring square pixel SAR (1:1) and proper DAR
    if aspect_ratio == "1:1":
        base_vf = "[0:v]setsar=1[v0];[v0]split[bg][fg];[bg]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,boxblur=25:5,eq=brightness=-0.2[bg_blur];[fg]scale=1080:-2:flags=lanczos[fg_scaled];[bg_blur][fg_scaled]overlay=(W-w)/2:(H-h)/2,setsar=1,setdar=1/1"
        out_aspect = "1:1"
    elif aspect_ratio == "16:9":
        base_vf = "[0:v]setsar=1,scale=1920:1080:force_original_aspect_ratio=decrease:flags=lanczos,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,setdar=16/9"
        out_aspect = "16:9"
    else:
        # Default 9:16 vertical short (1080x1920 Full HD YouTube Shorts format with ambient blurred wings)
        base_vf = "[0:v]setsar=1[v0];[v0]split[bg][fg];[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5,eq=brightness=-0.25[bg_blur];[fg]scale=1080:-2:flags=lanczos[fg_scaled];[bg_blur][fg_scaled]overlay=(W-w)/2:(H-h)/2,setsar=1,setdar=9/16"
        out_aspect = "9:16"

    base_af = "aresample=async=1:first_pts=0,asetpts=PTS-STARTPTS"

    # Subtitle burning filter with ASS styling matching aspect ratio (no red hook caption)
    ass_path = os.path.join(DOWNLOADS_DIR, f"{video_id or 'clip'}_{int(start_time)}_{int(end_time)}.ass")
    sub_ready = build_ass_file(start_time, end_time, "", subtitles, ass_path, aspect_ratio=aspect_ratio)

    vf_clean = f"{base_vf}[v_out]"
    if sub_ready and os.path.exists(ass_path):
        rel_ass = os.path.relpath(ass_path, os.getcwd()).replace("\\", "/")
        vf_filter = f"{base_vf},subtitles={rel_ass}[v_out]"
    else:
        vf_filter = vf_clean

    # 2-stage sample-accurate seeking calculation to eliminate all A/V offset drift
    fast_seek = max(0.0, start_time - 6.0)
    accurate_offset = start_time - fast_seek

    temp_cut_filepath = f"{output_filepath}.tmp.{uuid.uuid4().hex[:6]}.mp4"

    def run_cut_process(current_vf):
        if a_url and a_url != v_url:
            # Separate video and audio streams (YouTube DASH, etc.)
            cmd = [
                FFMPEG_EXE,
                "-y",
                "-fflags", "+genpts+discardcorrupt",
                "-thread_queue_size", "4096",
                "-ss", str(fast_seek),
                "-i", v_url,
                "-thread_queue_size", "4096",
                "-ss", str(fast_seek),
                "-i", a_url,
                "-ss", str(accurate_offset),
                "-t", str(duration),
                "-filter_complex", current_vf,
                "-map", "[v_out]",
                "-map", "1:a:0",
                "-af", base_af,
                "-fps_mode", "cfr",
                "-r", "30",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "18",
                "-aspect", out_aspect,
                "-c:a", "aac",
                "-b:a", "320k",
                "-ar", "48000",
                "-shortest",
                temp_cut_filepath
            ]
        else:
            # Single combined stream or local file
            cmd = [
                FFMPEG_EXE,
                "-y",
                "-fflags", "+genpts+discardcorrupt",
                "-thread_queue_size", "4096",
                "-ss", str(fast_seek),
                "-i", v_url,
                "-ss", str(accurate_offset),
                "-t", str(duration),
                "-filter_complex", current_vf,
                "-map", "[v_out]",
                "-map", "0:a:0?",
                "-af", base_af,
                "-fps_mode", "cfr",
                "-r", "30",
                "-c:v", "libx264",
                "-preset", "veryfast",
                "-crf", "18",
                "-aspect", out_aspect,
                "-c:a", "aac",
                "-b:a", "320k",
                "-ar", "48000",
                "-shortest",
                temp_cut_filepath
            ]
        return subprocess.run(cmd, capture_output=True, text=True)

    try:
        print(f"Cutting sample-accurate 1080p clip: {video_id} ({start_time}s to {end_time}s, {aspect_ratio})")
        res = run_cut_process(vf_filter)
        if res.returncode != 0 and vf_filter != vf_clean:
            print(f"Subtitle burn failed ({res.stderr[:200]}), falling back to clean video filter...")
            res = run_cut_process(vf_clean)

        if res.returncode != 0:
            print(f"FFmpeg error: {res.stderr[-500:]}")
            if os.path.exists(temp_cut_filepath):
                try:
                    os.remove(temp_cut_filepath)
                except Exception:
                    pass
            return jsonify({"error": f"FFmpeg processing failed: {res.stderr[-300:]}"}), 500

        # Clean up temporary ASS file
        if os.path.exists(ass_path):
            try:
                os.remove(ass_path)
            except Exception:
                pass

        if os.path.exists(temp_cut_filepath) and os.path.getsize(temp_cut_filepath) > 10000:
            os.replace(temp_cut_filepath, output_filepath)
            return send_from_directory(
                DOWNLOADS_DIR,
                output_filename,
                as_attachment=True,
                download_name=f"{clean_title}_{aspect_ratio.replace(':', '-')}.mp4",
                mimetype="video/mp4"
            )
        else:
            return jsonify({"error": "Video output file was not generated properly."}), 500

    except Exception as e:
        print(f"Error cutting clip: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
