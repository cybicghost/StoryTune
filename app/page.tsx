"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type Song = {
  title: string;
  artist: string;
  language: string;
  reason: string;
  vibe: string;
  lyricalMeaning: string[];
  youtubeUrl: string;
  album: string;
  albumCoverUrl: string | null;
  previewUrl?: string | null;
};

type Vibe = {
  mood: string;
  genres: string[];
  musicalMoods: string[];
  listeningStyles: string[];
  tags: string[];
  description: string;
};

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [recommending, setRecommending] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [genre, setGenre] = useState("");
  const [language, setLanguage] = useState("");
  const [theme, setTheme] = useState("");

function processPickedFile(picked: File | undefined) {
  if (!picked) return;

  if (!picked.type.startsWith("image/")) {
    setError("Please choose a valid image file.");
    return;
  }

  setFile(picked);
  setPreview(URL.createObjectURL(picked));
  setVibe(null);
  setSelectedTags([]);
  setSongs(null);
  setError(null);
}

function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
  processPickedFile(event.target.files?.[0]);
}
  function toggleTag(tag: string) {
  setSelectedTags((current) =>
    current.includes(tag)
      ? current.filter((item) => item !== tag)
      : [...current, tag]
  );
}
function startOver() {
  setFile(null);
  setPreview(null);
  setVibe(null);
  setSelectedTags([]);
  setSongs(null);
  setError(null);

  setGenre("");
  setLanguage("");
  setTheme("");
}
const tagGroups = [
  {
    title: "GENRES",
    tags: vibe?.genres ?? [],
  },
  {
    title: "MUSICAL MOODS",
    tags: vibe?.musicalMoods ?? [],
  },
  {
    title: "LISTENING STYLES",
    tags: vibe?.listeningStyles ?? [],
  },
];

  async function analyze() {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
     const genres = Array.isArray(data.genres) ? data.genres : [];
const musicalMoods = Array.isArray(data.musicalMoods)
  ? data.musicalMoods
  : [];
const listeningStyles = Array.isArray(data.listeningStyles)
  ? data.listeningStyles
  : [];

const safeVibe = {
  mood: data.mood || "Unknown mood",
  description: data.description || "No description available.",
  genres,
  musicalMoods,
  listeningStyles,
  tags: [...genres, ...musicalMoods, ...listeningStyles],
};

setVibe(safeVibe);
setSelectedTags([]);

    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  async function recommend() {
    if (!vibe) return;

    setRecommending(true);
    setError(null);

    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
  ...vibe,
  tags: selectedTags,
}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setSongs(data.songs);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong"
      );
    } finally {
      setRecommending(false);
    }
  }

  return (
    <main className="dream-page">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Story Song Picker home">
          <span className="brand-icon">♫</span>
          <span>story<span className="brand-accent">tune</span></span>
        </a>

        <span className="topbar-badge">
          <span className="status-dot" />
          YOUR PHOTO. YOUR SOUND.
        </span>
      </header>

      <section className="hero">
        <motion.div
  className="eyebrow"
  initial={{ opacity: 0, y: 15 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6 }}
>
          <span className="eyebrow-sparkle">✦</span>
          YOUR PERSONAL MUSIC UNIVERSE
        </motion.div>

        <motion.h1
  initial={{ opacity: 0, y: 22 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, delay: 0.15 }}
>
          Every photo has
          <br />
          a <span className="gradient-text">soundtrack.</span>
        </motion.h1>

        <motion.p
  className="hero-description"
  initial={{ opacity: 0, y: 18 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, delay: 0.3 }}
>
          Let your pictures tell their story. Discover songs that match
          your photo&apos;s vibe, your mood, and your kind of music.
        </motion.p>

        <div className="hero-decoration" aria-hidden="true">
          <span className="orbit orbit-one" />
          <span className="orbit orbit-two" />
          <span className="orbit-center">♫</span>
        </div>
      </section>

      <section className="workspace">
        <div className="section-heading">
          <div className="step-number">01</div>
          <div>
            <h2>Choose your moment</h2>
            <p>Start with a photo that says it all.</p>
          </div>
        </div>

        <div className={`upload-card ${preview ? "has-preview" : ""}`}>
          <AnimatePresence mode="wait">
          {!preview ? (
 <motion.label
  initial={{ opacity: 0, y: 25 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: 0.7,
    delay: 0.4,
    ease: "easeOut",
  }}
  className={
    isDragging
      ? "upload-dropzone is-dragging"
      : "upload-dropzone"
  }
  onDragOver={(event) => {
    event.preventDefault();
    setIsDragging(true);
  }}
  onDragLeave={(event) => {
    event.preventDefault();
    setIsDragging(false);
  }}
  onDrop={(event) => {
    event.preventDefault();
    setIsDragging(false);
    processPickedFile(event.dataTransfer.files?.[0]);
  }}
>
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="file-input"
              />

              <span className="upload-icon">↥</span>
              <span className="upload-title">Drop your vibe here</span>
              <span className="upload-subtitle">
                or click to browse your photos
              </span>
              <span className="upload-formats">
                JPG, PNG, WEBP · Choose an image
              </span>
            </motion.label>
           ) : (
    <motion.div
      key="preview"
      className="preview-layout"
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
              <div className="preview-image-wrap">
                <img
                  src={preview}
                  alt="Your selected photo"
                  className="preview-image"
                />
                <span className="preview-badge">PHOTO SELECTED</span>
              </div>

              <div className="preview-info">
                <span className="mini-label">YOUR MOMENT</span>
                <h3>Looking good.</h3>
                <p>
                  Ready to discover the music hidden in this moment?
                </p>

                <label className="change-photo-button">
                  Change photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    className="file-input"
                  />
                </label>
                <button
  type="button"
  className="reset-session-button"
  onClick={startOver}
  disabled={loading || recommending}
>
  ↺ Start over
</button>

                <button
                  className="primary-button analyze-button"
                  onClick={analyze}
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Reading your vibe...
                    </>
                  ) : (
                    <>✦ &nbsp; Discover photo vibe</>
                  )}
                </button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

                {error && (
          <div className="error-message" role="alert">
            <span>!</span>
            {error}
          </div>
        )}
      </section>

      <AnimatePresence>
  {vibe && (
    <motion.section
      key="vibe-section"
      className="workspace preferences-section"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
    <div className="section-heading">
      <div className="step-number">02</div>
      <div>
        <h2>Your photo's personality</h2>
        <p>AI found these vibes in your picture. Pick what resonates.</p>
      </div>
    </div>

    <div className="preferences-card">

      <div className="vibe-card">
        <span className="mini-label">AI DETECTED MOOD</span>
        <div className="vibe-card-top">
          <h2>{vibe.mood}</h2>
          <span className="vibe-symbol">✦</span>
        </div>

        <p className="vibe-description">
          {vibe.description}
        </p>
      </div>

      <div className="tag-selection">
        <span className="mini-label">CHOOSE YOUR VIBE</span>

        <p className="tag-instruction">
          Select the moods and feelings you want your music to capture.
        </p>

        <div className="tag-groups">
  {tagGroups.map((group) => (
    <div className="tag-group" key={group.title}>
      <h4 className="tag-group-title">{group.title}</h4>

      <div className="tag-list">
        {group.tags.map((tag) => (
          <motion.button
  whileHover={{ scale: 1.06, y: -2 }}
  whileTap={{ scale: 0.94 }}
  transition={{
    type: "spring",
    stiffness: 400,
    damping: 17,
  }}
            className={`vibe-tag ${
              selectedTags.includes(tag) ? "selected" : ""
            }`}
            onClick={() => toggleTag(tag)}
            aria-pressed={selectedTags.includes(tag)}
          >
            {selectedTags.includes(tag) ? "✓ " : "+ "}
            {tag}
          </motion.button>
        ))}
      </div>
    </div>
  ))}
</div>

        <p className="selected-count">
          {selectedTags.length} vibes selected
        </p>
      </div>

      <button
        className="primary-button recommend-button"
        onClick={recommend}
        disabled={recommending || selectedTags.length === 0}
        aria-busy={recommending}
      >
        {recommending ? (
          <>
            <span className="spinner" />
            Finding your soundtrack...
          </>
        ) : (
          <>
            ✦ &nbsp; Discover my soundtrack
            <span> ↗</span>
          </>
        )}
      </button>

      <p className="privacy-note">
        ✦ &nbsp; Your photo. Your vibe. Your soundtrack.
      </p>

    </div>
    </motion.section>
  )}
</AnimatePresence>

      <AnimatePresence>
  {songs && (
    <motion.section
      key="song-results"
      className="results-section"
      initial={{ opacity: 0, y: 35 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -25 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
          <div className="results-heading">
            <div>
              <span className="mini-label">MADE FOR YOUR MOMENT</span>
              <h2>
                Your <span className="gradient-text">soundtrack.</span>
              </h2>
              <p>
  Your photo, translated into music. Discover 8–10 songs
  chosen for your vibe.
</p>
            </div>

            <span className="results-count">
              {songs.length} SONGS
            </span>
          </div>

          <div className="song-grid">
            {songs.map((song, index) => (
              <motion.article
  className="song-card"
  key={`${song.title}-${index}`}
  initial={{ opacity: 0, y: 35, scale: 0.97 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{
    duration: 0.55,
    delay: index * 0.12,
    ease: "easeOut",
  }}
  whileHover={{
    y: -7,
    transition: { duration: 0.2 },
  }}
>
                <div className="song-card-top">
                  <span className="song-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="song-vibe-label">
                    {song.vibe || "YOUR VIBE"}
                  </span>
                </div>

                <div className="album-art-wrap">
                  {song.albumCoverUrl ? (
                    <img
                      src={song.albumCoverUrl}
                      alt={`${song.album || song.title} album cover`}
                      className="album-art"
                      loading="lazy"
                    />
                  ) : (
                    <div className="album-placeholder">
                      <span>♫</span>
                    </div>
                  )}
                  <div className="album-art-overlay" />
                </div>

                <div className="song-details">
                  <h3>{song.title}</h3>
                  <p className="song-artist">{song.artist}</p>

                  <div className="song-meta">
                    <span>{song.language}</span>
                    {song.album && <span>{song.album}</span>}
                  </div>

                  {song.previewUrl ? (
                    <div className="song-preview-wrap">
                      <span className="mini-label">30-SECOND PREVIEW</span>
                      <audio
                        className="song-preview"
                        controls
                        preload="none"
                        src={song.previewUrl}
                      >
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  ) : (
                    <p className="preview-unavailable">
                      Audio preview unavailable for this track.
                    </p>
                  )}

                  <p className="song-reason">{song.reason}</p>

                  <div className="lyric-box">
                    <span className="mini-label">WHY IT RESONATES</span>

                    {song.lyricalMeaning?.length ? (
                      song.lyricalMeaning.map((line, lineIndex) => (
                        <p key={lineIndex}>{line}</p>
                      ))
                    ) : (
                      <p>
                        A song selected to complement the feeling of your
                        photo.
                      </p>
                    )}
                  </div>

                  <a
                    className="youtube-button"
                    href={song.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="youtube-play">▶</span>
                    Listen on YouTube
                    <span className="youtube-arrow">↗</span>
                  </a>
                </div>
              </motion.article>
            ))}
          </div>
            </motion.section>
  )}
</AnimatePresence>

      <footer className="footer">
        <div className="footer-brand">
          <span className="brand-icon">♫</span>
          storytune
        </div>
        <p>Some moments deserve their own music.</p>
        <span className="footer-star">✦</span>
      </footer>
    </main>
  );
}