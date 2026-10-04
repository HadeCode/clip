// Real in-browser Canvas Video Renderer & MediaRecorder Exporter

export async function exportVideoClip({
  videoElement,
  thumbnailUrl = "",
  startTime,
  endTime,
  aspectRatio = "9:16",
  subtitles = [],
  subtitleConfig = {},
  headline = "",
  brandKit = {},
  onProgress = () => {}
}) {
  return new Promise(async (resolve, reject) => {
    try {
      // Determine canvas dimensions based on aspect ratio
      let width = 1080;
      let height = 1920; // 9:16 vertical shorts default Full HD

      if (aspectRatio === "1:1") {
        width = 1080;
        height = 1080;
      } else if (aspectRatio === "16:9") {
        width = 1920;
        height = 1080;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // Setup hidden render container
      canvas.style.position = "fixed";
      canvas.style.top = "-9999px";
      canvas.style.left = "-9999px";
      document.body.appendChild(canvas);

      // Check supported MediaRecorder mimeType
      const mimeTypes = [
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=h264",
        "video/webm"
      ];
      let selectedMime = "";
      for (const mime of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      // Stream from canvas
      const stream = canvas.captureStream(30);

      // Attempt to capture audio from video element if available
      try {
        if (videoElement?.captureStream) {
          const videoStream = videoElement.captureStream();
          const audioTracks = videoStream.getAudioTracks();
          if (audioTracks.length > 0) {
            stream.addTrack(audioTracks[0]);
          }
        } else if (videoElement?.mozCaptureStream) {
          const videoStream = videoElement.mozCaptureStream();
          const audioTracks = videoStream.getAudioTracks();
          if (audioTracks.length > 0) {
            stream.addTrack(audioTracks[0]);
          }
        }
      } catch (err) {
        console.warn("Could not capture direct audio track, proceeding with video stream", err);
      }

      const recorderOptions = selectedMime ? { mimeType: selectedMime, videoBitsPerSecond: 8000000 } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      const recordedChunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      const clipDuration = Math.max(2, endTime - startTime);
      let isRecording = true;

      // Brand Logo image caching if present and explicitly enabled
      let logoImg = null;
      if (brandKit?.logo?.url && brandKit?.watermarkEnabled === true) {
        logoImg = new Image();
        logoImg.crossOrigin = "anonymous";
        logoImg.src = brandKit.logo.url;
      }

      // Check if video element is ready and playable
      const hasDirectVideo = videoElement && videoElement.videoWidth > 0 && !videoElement.error;

      // Fallback Thumbnail image caching with preloading
      let thumbImg = null;
      if (thumbnailUrl && !hasDirectVideo) {
        await new Promise((resolve) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            thumbImg = img;
            resolve();
          };
          img.onerror = () => {
            const fallback = new Image();
            fallback.onload = () => {
              thumbImg = fallback;
              resolve();
            };
            fallback.onerror = resolve;
            fallback.src = thumbnailUrl;
          };
          img.src = thumbnailUrl;
          setTimeout(resolve, 600);
        });
      }

      // Start recording
      recorder.start(100);

      if (hasDirectVideo) {
        videoElement.currentTime = startTime;
        videoElement.muted = false;
        const playPromise = videoElement.play();
        if (playPromise) playPromise.catch((e) => console.log("Play error during export:", e));
      }

      const renderStartTime = performance.now();

      function drawFrame(now) {
        if (!isRecording) return;

        let currentVideoTime = startTime;
        const elapsedSecs = (now - renderStartTime) / 1000;
        if (hasDirectVideo && !videoElement.paused && Math.abs(videoElement.currentTime - startTime) > 0.01) {
          currentVideoTime = videoElement.currentTime;
        } else {
          currentVideoTime = startTime + elapsedSecs;
        }

        const progressTime = currentVideoTime - startTime;
        const progressPercent = Math.min(100, Math.max(0, (progressTime / clipDuration) * 100));
        
        onProgress(Math.round(progressPercent));

        // Background Fill
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, width, height);

        // Aspect ratio handling:
        if (hasDirectVideo) {
          const vw = videoElement.videoWidth || 1920;
          const vh = videoElement.videoHeight || 1080;

          if (aspectRatio === "9:16") {
            // Blurred background
            ctx.save();
            ctx.filter = "blur(24px) brightness(0.4)";
            const bgScale = Math.max(width / vw, height / vh) * 1.2;
            const bgW = vw * bgScale;
            const bgH = vh * bgScale;
            ctx.drawImage(videoElement, (width - bgW) / 2, (height - bgH) / 2, bgW, bgH);
            ctx.restore();

            // Centered main video
            const mainScale = width / vw;
            const mainW = width;
            const mainH = vh * mainScale;
            const mainY = (height - mainH) / 2;
            ctx.drawImage(videoElement, 0, mainY, mainW, mainH);
          } else if (aspectRatio === "1:1") {
            const scale = Math.max(width / vw, height / vh);
            const drawW = vw * scale;
            const drawH = vh * scale;
            ctx.drawImage(videoElement, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
          } else {
            ctx.drawImage(videoElement, 0, 0, width, height);
          }
        } else if (thumbImg && thumbImg.complete && thumbImg.naturalWidth > 0) {
          // Fallback stream visualizer
          const tw = thumbImg.naturalWidth;
          const th = thumbImg.naturalHeight;

          // Blurred background
          ctx.save();
          ctx.filter = "blur(30px) brightness(0.35)";
          const bgScale = Math.max(width / tw, height / th) * 1.25;
          ctx.drawImage(thumbImg, (width - tw * bgScale) / 2, (height - th * bgScale) / 2, tw * bgScale, th * bgScale);
          ctx.restore();

          // Centered image
          const mainScale = Math.min(width / tw, (height * 0.7) / th);
          const mw = tw * mainScale;
          const mh = th * mainScale;
          ctx.drawImage(thumbImg, (width - mw) / 2, (height - mh) / 2, mw, mh);

          // Simulated Audio Waveform Bar
          ctx.save();
          const barCount = 36;
          const barW = (width * 0.7) / barCount;
          const startX = width * 0.15;
          const waveY = height * 0.5 + mh * 0.45;
          ctx.fillStyle = "rgba(108, 92, 231, 0.85)";

          for (let b = 0; b < barCount; b++) {
            const waveH = 10 + Math.sin(now * 0.008 + b * 0.3) * 24 + Math.cos(now * 0.012 + b * 0.4) * 15;
            ctx.fillRect(startX + b * barW, waveY - waveH / 2, barW - 3, waveH);
          }
          ctx.restore();
        }



        // Draw Brand Logo Watermark (only if explicitly enabled in Brand Kit)
        if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
          ctx.save();
          ctx.globalAlpha = brandKit?.logo?.opacity || 0.85;
          const logoSize = brandKit?.logo?.size || 60;
          const pos = brandKit?.logo?.position || "top-right";
          let lx = width - logoSize - 40;
          let ly = 40;

          if (pos === "top-left") { lx = 40; ly = 40; }
          else if (pos === "bottom-left") { lx = 40; ly = height - logoSize - 50; }
          else if (pos === "bottom-right") { lx = width - logoSize - 40; ly = height - logoSize - 50; }

          ctx.drawImage(logoImg, lx, ly, logoSize, logoSize);
          ctx.restore();
        }

        // Draw Dynamic Word-Highlighted Subtitles with Intelligent Line-Wrapping
        const currentActiveCue = subtitles.find(
          (s) => currentVideoTime >= s.start && currentVideoTime <= s.end
        );

        if (currentActiveCue) {
          ctx.save();
          const cfg = subtitleConfig || {};
          const fontSize = cfg.fontSize ? cfg.fontSize * (width / 720) : 32 * (width / 720);
          const fontFamily = cfg.fontFamily || "Plus Jakarta Sans";
          const isUppercase = cfg.uppercase !== false;
          const textColor = cfg.textColor || "#FFFFFF";
          const activeColor = cfg.activeColor || "#FFDD00";
          const strokeColor = cfg.strokeColor || "#000000";
          const strokeWidth = cfg.strokeWidth || 4;
          const maxLineWidth = width * 0.82;
          const lineHeight = fontSize * 1.35;

          let subtitleY = height - (aspectRatio === "9:16" ? 300 : 150);
          if (cfg.position === "middle") subtitleY = height / 2 + 100;
          if (cfg.position === "top") subtitleY = 240;

          ctx.font = `800 ${fontSize}px '${fontFamily}', Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // If words timing is available, group into lines that fit within maxLineWidth!
          if (currentActiveCue.words && currentActiveCue.words.length > 0) {
            const rawWords = currentActiveCue.words;
            const spaceWidth = ctx.measureText(" ").width;

            const lines = [];
            let currentLine = [];
            let curWidth = 0;

            rawWords.forEach((wObj) => {
              const text = isUppercase ? (wObj.word || "").toUpperCase() : (wObj.word || "");
              const wWidth = ctx.measureText(text).width;

              if (currentLine.length > 0 && curWidth + spaceWidth + wWidth > maxLineWidth) {
                lines.push({ words: currentLine, width: curWidth });
                currentLine = [{ ...wObj, displayWord: text, width: wWidth }];
                curWidth = wWidth;
              } else {
                currentLine.push({ ...wObj, displayWord: text, width: wWidth });
                curWidth += (currentLine.length === 1 ? 0 : spaceWidth) + wWidth;
              }
            });

            if (currentLine.length > 0) {
              lines.push({ words: currentLine, width: curWidth });
            }

            // Draw each line centered without cutting off
            lines.forEach((line, lIdx) => {
              const lineY = subtitleY + (lIdx - (lines.length - 1) / 2) * lineHeight;

              // Background box pill for this line
              if (cfg.hasBackgroundBox !== false) {
                ctx.fillStyle = cfg.backgroundColor || "rgba(0, 0, 0, 0.78)";
                const boxPad = 16;
                const boxHeight = fontSize * 1.5;
                ctx.beginPath();
                ctx.roundRect(
                  (width - line.width - boxPad * 2) / 2,
                  lineY - boxHeight / 2,
                  line.width + boxPad * 2,
                  boxHeight,
                  10
                );
                ctx.fill();
              }

              let curX = (width - line.width) / 2;
              line.words.forEach((wObj) => {
                const isWordActive = currentVideoTime >= wObj.start && currentVideoTime <= wObj.end;

                ctx.lineWidth = strokeWidth;
                ctx.strokeStyle = strokeColor;
                ctx.strokeText(wObj.displayWord, curX + wObj.width / 2, lineY);

                ctx.fillStyle = isWordActive ? activeColor : textColor;
                ctx.fillText(wObj.displayWord, curX + wObj.width / 2, lineY);

                curX += wObj.width + spaceWidth;
              });
            });
          } else {
            const rawWords = (currentActiveCue.text || "").split(/\s+/).filter(Boolean);
            const spaceWidth = ctx.measureText(" ").width;

            const lines = [];
            let currentLine = [];
            let curWidth = 0;

            rawWords.forEach((word) => {
              const text = isUppercase ? word.toUpperCase() : word;
              const wWidth = ctx.measureText(text).width;

              if (currentLine.length > 0 && curWidth + spaceWidth + wWidth > maxLineWidth) {
                lines.push({ text: currentLine.join(" "), width: curWidth });
                currentLine = [text];
                curWidth = wWidth;
              } else {
                currentLine.push(text);
                curWidth += (currentLine.length === 1 ? 0 : spaceWidth) + wWidth;
              }
            });

            if (currentLine.length > 0) {
              lines.push({ text: currentLine.join(" "), width: curWidth });
            }

            lines.forEach((line, lIdx) => {
              const lineY = subtitleY + (lIdx - (lines.length - 1) / 2) * lineHeight;

              if (cfg.hasBackgroundBox !== false) {
                ctx.fillStyle = cfg.backgroundColor || "rgba(0, 0, 0, 0.78)";
                const boxPad = 16;
                const boxHeight = fontSize * 1.5;
                ctx.beginPath();
                ctx.roundRect((width - line.width - boxPad * 2) / 2, lineY - boxHeight / 2, line.width + boxPad * 2, boxHeight, 10);
                ctx.fill();
              }

              ctx.lineWidth = strokeWidth;
              ctx.strokeStyle = strokeColor;
              ctx.strokeText(line.text, width / 2, lineY);

              ctx.fillStyle = textColor;
              ctx.fillText(line.text, width / 2, lineY);
            });
          }

          ctx.restore();
        }

        // Draw Bottom Animated Progress Bar
        if (brandKit?.showProgressBar !== false) {
          ctx.save();
          const barHeight = 8;
          const barY = height - barHeight;
          const fillWidth = (progressPercent / 100) * width;

          ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
          ctx.fillRect(0, barY, width, barHeight);

          ctx.fillStyle = brandKit?.progressBarColor || "#6c5ce7";
          ctx.fillRect(0, barY, fillWidth, barHeight);
          ctx.restore();
        }

        // Check if reached endTime
        if (currentVideoTime >= endTime || (hasDirectVideo && videoElement.ended)) {
          finishRecording();
          return;
        }

        requestAnimationFrame(drawFrame);
      }

      function finishRecording() {
        if (!isRecording) return;
        isRecording = false;
        try {
          if (hasDirectVideo && videoElement && !videoElement.paused) {
            videoElement.pause();
          }
        } catch (_) {}

        onProgress(100);

        const safeCleanupAndResolve = () => {
          if (canvas.parentNode) {
            try { canvas.parentNode.removeChild(canvas); } catch (_) {}
          }

          const fileExt = selectedMime.includes("mp4") ? "mp4" : "webm";
          const blob = new Blob(recordedChunks, { type: selectedMime || "video/webm" });
          const downloadUrl = URL.createObjectURL(blob);

          resolve({
            blob,
            url: downloadUrl,
            mimeType: selectedMime,
            extension: fileExt,
            sizeBytes: blob.size,
            formattedSize: `${(blob.size / (1024 * 1024)).toFixed(1)} MB`
          });
        };

        if (recorder && recorder.state === "recording") {
          recorder.onstop = safeCleanupAndResolve;
          try {
            recorder.stop();
          } catch (e) {
            console.warn("MediaRecorder stop warning:", e);
            safeCleanupAndResolve();
          }
        } else {
          safeCleanupAndResolve();
        }
      }

      requestAnimationFrame(drawFrame);

      // Safety timeout
      setTimeout(() => {
        if (isRecording) finishRecording();
      }, (clipDuration + 4) * 1000);

    } catch (err) {
      console.error("Export failed:", err);
      reject(err);
    }
  });
}
