"""
Audio loader: uses the bundled ffmpeg (via imageio-ffmpeg) to extract/normalise
audio, then OpenAI Whisper (local, offline) to transcribe with timestamps.

Returns a list of segment dicts:
  { "start": float, "end": float, "text": str }
"""
import os
import subprocess
import tempfile
import numpy as np
from typing import List, Dict

SUPPORTED = {".mp3", ".mp4", ".wav", ".m4a", ".ogg", ".flac", ".webm", ".aac", ".wma"}


def _get_ffmpeg() -> str:
    """Return path to ffmpeg — system binary first, then bundled fallback."""
    # Prefer system ffmpeg (available in Docker via apt)
    import shutil
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def _to_wav(file_path: str, tmp_dir: str) -> str:
    """Convert any audio/video to a 16 kHz mono WAV using bundled ffmpeg."""
    ffmpeg = _get_ffmpeg()
    out_path = os.path.join(tmp_dir, "audio.wav")
    cmd = [
        ffmpeg, "-y",
        "-i", file_path,
        "-ar", "16000",
        "-ac", "1",
        "-vn",
        out_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg conversion failed:\n{result.stderr}")
    return out_path


def _patch_whisper_ffmpeg():
    """
    Monkey-patch whisper.audio so it uses the bundled ffmpeg binary
    instead of looking for 'ffmpeg' on PATH.
    """
    try:
        import whisper.audio as wa
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

        original_load = wa.load_audio

        def patched_load_audio(file: str, sr: int = wa.SAMPLE_RATE):
            from subprocess import run, CalledProcessError
            cmd = [
                ffmpeg_exe,
                "-nostdin", "-threads", "0",
                "-i", file,
                "-f", "s16le",
                "-ac", "1",
                "-acodec", "pcm_s16le",
                "-ar", str(sr),
                "-",
            ]
            try:
                out = run(cmd, capture_output=True, check=True).stdout
            except CalledProcessError as e:
                raise RuntimeError(f"Failed to load audio: {e.stderr.decode()}") from e
            return np.frombuffer(out, np.int16).flatten().astype(np.float32) / 32768.0

        wa.load_audio = patched_load_audio
    except Exception:
        pass  # if patching fails, whisper will try system ffmpeg


def transcribe(file_path: str) -> List[Dict]:
    """
    Transcribe an audio file and return timestamped segments.
    Uses the bundled ffmpeg — no system installation required.
    """
    _patch_whisper_ffmpeg()
    import whisper

    model = whisper.load_model("base")
    result = model.transcribe(file_path, verbose=False, word_timestamps=False)

    segments = []
    for seg in result.get("segments", []):
        segments.append({
            "start": round(seg["start"], 2),
            "end": round(seg["end"], 2),
            "text": seg["text"].strip(),
        })
    return segments
