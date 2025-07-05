import React, { useState, useEffect, useRef, useCallback } from 'react';

const ClarityAI = () => {
  const [currentScreen, setCurrentScreen] = useState('intro');
  const [speechText, setSpeechText] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [currentCarousel, setCurrentCarousel] = useState(0);

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const utteranceRef = useRef(null);

  // Replace with your Render URL
  const API_URL = 'https://clarityai2backend.onrender.com';

  // About content for carousels
const aboutContent = [
  {
    title: "🎤 Speech Analysis",
    content: "Clarity AI analyzes your speech patterns and identifies the demographic perspectives embedded in your communication. Our advanced AI understands nuances in language, tone, and messaging style.",
    icon: "🔍"
  },
  {
    title: "🔄 Perspective Generation", 
    content: "Get alternative versions of your speech tailored to different demographic groups. See how your message might resonate with progressive, conservative, moderate, and other audience segments.",
    icon: "👥"
  },
  {
    title: "🎯 Communication Enhancement",
    content: "Improve your public speaking, presentations, and written communication by understanding how different audiences perceive your message. Perfect for politicians, educators, and public speakers.",
    icon: "📈"
  }
];

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setIsTranscribing(true);
      };

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setSpeechText(prev => prev + finalTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        setIsTranscribing(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        setIsTranscribing(false);
        showError(`Speech recognition error: ${event.error}`);
      };
    }
  }, []);

  // Theme toggle function
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);

    // Save to localStorage
    localStorage.setItem('clarityai-theme', newTheme ? 'dark' : 'light');

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
  };

  // About modal functions
const toggleAbout = () => {
  setShowAbout(!showAbout);
  if (!showAbout) {
    setCurrentCarousel(0);
  }
};

const nextCarousel = () => {
  setCurrentCarousel((prev) => (prev + 1) % aboutContent.length);
};

const prevCarousel = () => {
  setCurrentCarousel((prev) => (prev - 1 + aboutContent.length) % aboutContent.length);
};

  useEffect(() => {
    // Load saved theme or detect system preference
    const savedTheme = localStorage.getItem('clarityai-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    let initialTheme;
    if (savedTheme) {
      initialTheme = savedTheme === 'dark';
    } else {
      initialTheme = systemPrefersDark;
    }

    setIsDarkMode(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme ? 'dark' : 'light');
    document.body.className = initialTheme ? 'dark-theme' : 'light-theme';

    const timer = setTimeout(() => {
      setCurrentScreen('input');
    }, 3000);

    initializeSpeechRecognition();

    return () => clearTimeout(timer);
  }, [initializeSpeechRecognition]);

  // Update body class when theme changes
  useEffect(() => {
    document.body.className = isDarkMode ? 'dark-theme' : 'light-theme';
  }, [isDarkMode]);

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      showError('Speech recognition not supported in this browser');
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (error) {
      showError('Could not start speech recognition');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const clearText = () => {
    setSpeechText('');
  };

  const analyzeSpeech = async () => {
    if (!speechText.trim()) {
      showError('Please enter some text or use voice input');
      return;
    }

    setCurrentScreen('loading');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: speechText }),
      });

      if (response.ok) {
        const result = await response.json();
        setAnalysisResult(result);
        setCurrentScreen('results');
      } else {
        showError('Analysis failed. Please check your connection and try again.');
        setCurrentScreen('input');
      }
    } catch (error) {
      showError('Analysis failed. Server might be starting up, please try again.');
      setCurrentScreen('input');
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced Text-to-Speech with natural voices and pause functionality
  // Enhanced Text-to-Speech with high-quality free voices
const playTextToSpeech = async (text, voiceType = 'default', speechIndex = null) => {
  // If already playing this speech, pause it
  if (isPlayingAudio === speechIndex) {
    pauseTextToSpeech();
    return;
  }

  // Stop any currently playing speech
  if (isPlayingAudio !== null) {
    stopTextToSpeech();
  }

  setIsPlayingAudio(speechIndex);

  try {
    await enhancedSpeechSynthesis(text, voiceType);
  } catch (error) {
    console.error('TTS error:', error);
    setIsPlayingAudio(null);
    showError('Text-to-speech failed');
  }
};

  const pauseTextToSpeech = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.pause();
    window.speechSynthesis.cancel();
  }
  setIsPlayingAudio(null);
  utteranceRef.current = null;
};

const stopTextToSpeech = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  setIsPlayingAudio(null);
  utteranceRef.current = null;
};

// Enhanced Speech Synthesis with better voice selection
// Enhanced Speech Synthesis with better voice selection
const enhancedSpeechSynthesis = async (text, voiceType) => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Speech synthesis not supported'));
      return;
    }

    // Wait for voices to load
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        setTimeout(loadVoices, 100);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Enhanced voice selection with better quality voices
      let selectedVoice = null;

      const voicePreferences = {
        'progressive': [
          'Microsoft Zira - English (United States)',
          'Google UK English Female',
          'Alex (Enhanced)',
          voices.find(v => v.name.includes('Female') && v.name.includes('UK')),
          voices.find(v => v.name.includes('Female') && v.lang.includes('en-GB')),
          voices.find(v => v.name.includes('Female') && v.lang.includes('en'))
        ],
        'conservative': [
          'Microsoft David - English (United States)',
          'Google US English Male',
          'Fred (Enhanced)',
          voices.find(v => v.name.includes('Male') && v.name.includes('US')),
          voices.find(v => v.name.includes('Male') && v.lang.includes('en-US')),
          voices.find(v => v.name.includes('Male') && v.lang.includes('en'))
        ],
        'moderate': [
          'Microsoft Catherine - English (Australia)',
          'Google Australian English Female',
          'Karen (Enhanced)',
          voices.find(v => v.name.includes('Australia')),
          voices.find(v => v.lang.includes('en-AU')),
          voices.find(v => v.name.includes('Female') && v.lang.includes('en'))
        ],
        'default': [
          'Microsoft Zira - English (United States)',
          'Google US English Female',
          'Samantha (Enhanced)',
          voices.find(v => v.name.includes('Enhanced')),
          voices.find(v => v.name.includes('Microsoft')),
          voices.find(v => v.lang.includes('en-US'))
        ]
      };

      const preferences = voicePreferences[voiceType] || voicePreferences['default'];

      for (const preference of preferences) {
        if (typeof preference === 'string') {
          selectedVoice = voices.find(v => v.name === preference);
        } else if (preference && typeof preference === 'object') {
          selectedVoice = preference;
        }

        if (selectedVoice) break;
      }

      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.includes('en')) || voices[0];
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;

      if (voiceType === 'progressive') {
        utterance.pitch = 1.1;
        utterance.rate = 0.85;
      } else if (voiceType === 'conservative') {
        utterance.pitch = 0.9;
        utterance.rate = 0.75;
      } else if (voiceType === 'moderate') {
        utterance.pitch = 1.0;
        utterance.rate = 0.8;
      }

      utterance.onend = () => {
        setIsPlayingAudio(null);
        utteranceRef.current = null;
        resolve();
      };

      utterance.onerror = (event) => {
        setIsPlayingAudio(null);
        utteranceRef.current = null;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      window.speechSynthesis.cancel();
      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 100);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices, { once: true });
    } else {
      loadVoices();
    }
  });
};

  // Enhanced fallback TTS with better voice selection
  const fallbackToSpeechSynthesis = (text, voiceType) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);

      // Get available voices and select the best one
      const voices = window.speechSynthesis.getVoices();
      let selectedVoice = null;

      // Voice selection logic for different demographics
      if (voiceType === 'progressive') {
        selectedVoice = voices.find(voice => 
          voice.name.includes('Female') && 
          (voice.name.includes('UK') || voice.name.includes('British'))
        ) || voices.find(voice => voice.name.includes('Female'));
      } else if (voiceType === 'conservative') {
        selectedVoice = voices.find(voice => 
          voice.name.includes('Male') && 
          voice.name.includes('US')
        ) || voices.find(voice => voice.name.includes('Male'));
      } else if (voiceType === 'moderate') {
        selectedVoice = voices.find(voice => 
          voice.name.includes('Female') && 
          voice.name.includes('Australian')
        ) || voices.find(voice => voice.name.includes('Female'));
      } else {
        selectedVoice = voices.find(voice => 
          voice.name.includes('Female') && 
          voice.name.includes('US')
        ) || voices.find(voice => voice.name.includes('Female'));
      }

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.rate = 0.85;    // Natural speaking rate
      utterance.pitch = 1.0;    // Natural pitch
      utterance.volume = 0.9;   // Good volume level

      utterance.onend = () => {
        setIsPlayingAudio(null);
      };

      utterance.onerror = () => {
        setIsPlayingAudio(null);
        showError('Text-to-speech failed');
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(null);
      showError('Text-to-speech not supported in this browser');
    }
  };

  const resetApp = () => {
    setSpeechText('');
    setAnalysisResult(null);
    setError('');
    setCurrentScreen('input');
  };

  const copyResults = () => {
    if (!analysisResult) return;

    const resultsText = `
ClarityAI Analysis Results
========================

Category: ${analysisResult.category}
Demographics: ${analysisResult.demographics.join(', ')}

Alternative Speeches:
${analysisResult.alternateSpeeches.map(alt => `${alt.demographic}: ${alt.speech}`).join('\n\n')}
    `.trim();

    navigator.clipboard.writeText(resultsText).then(() => {
      alert('Results copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard');
    });
  };

  const isSpeechSupported = () => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  };

  const getVoiceType = (demographic) => {
    const lowerDemo = demographic.toLowerCase();
    if (lowerDemo.includes('progressive') || lowerDemo.includes('liberal')) return 'progressive';
    if (lowerDemo.includes('conservative') || lowerDemo.includes('right')) return 'conservative';
    if (lowerDemo.includes('moderate') || lowerDemo.includes('center')) return 'moderate';
    return 'default';
  };

  return (
    <div className={`app-container ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      {/* Load ResponsiveVoice API */}
      {typeof window !== 'undefined' && (
        <script src="https://code.responsivevoice.org/responsivevoice.js?key=FREE_TRIAL_KEY"></script>
      )}

      <audio ref={audioRef} />
      {/* About Button */}
<button 
  className="about-toggle"
  onClick={toggleAbout}
  aria-label="About ClarityAI"
  title="Learn about ClarityAI"
>
  ?
</button>

      {/* Theme Toggle Button */}
      <button 
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      >
        {isDarkMode ? '☀️' : '🌙'}
      </button>

      {/* About Modal */}
{showAbout && (
  <div className="about-modal">
    <div className="about-content">
      <div className="about-header">
        <h2>About ClarityAI</h2>
        <button className="close-btn" onClick={toggleAbout}>×</button>
      </div>

      <div className="carousel-container">
        <div className="carousel-slide">
          <div className="slide-icon">{aboutContent[currentCarousel].icon}</div>
          <h3>{aboutContent[currentCarousel].title}</h3>
          <p>{aboutContent[currentCarousel].content}</p>
        </div>

        <div className="carousel-controls">
          <button className="carousel-btn" onClick={prevCarousel}>‹</button>

          <div className="carousel-indicators">
            {aboutContent.map((_, index) => (
              <span 
                key={index}
                className={`indicator ${index === currentCarousel ? 'active' : ''}`}
                onClick={() => setCurrentCarousel(index)}
              ></span>
            ))}
          </div>

          <button className="carousel-btn" onClick={nextCarousel}>›</button>
        </div>
      </div>

      <div className="about-footer">
        <p>Powered by advanced AI • Free to use • Privacy focused</p>
      </div>
    </div>
  </div>
)}

      {/* Animated background */}
      <div className="background-animation">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
        <div className="floating-shape shape-4"></div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="error-toast">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Intro Screen */}
      {currentScreen === 'intro' && (
        <div className="intro-screen">
          <div className="intro-content">
            <div className="logo-container">
              <h1 className="app-title">Clarity</h1>
              <div className="subtitle">AI-Powered Speech Analysis</div>
            </div>
            <div className="loading-orb"></div>
          </div>
        </div>
      )}

      {/* Input Screen */}
      {currentScreen === 'input' && (
        <div className="screen-container">
          <div className="glass-container">
            <div className="header-section">
              <h1 className="main-title">Clarity</h1>
              <p className="main-subtitle">
                Analyze your speech and explore alternative perspectives
              </p>
            </div>

            <div className="input-card">
              <div className="input-section">
                <label className="input-label">
                  Enter your speech or use voice input
                </label>
                <textarea
                  value={speechText}
                  onChange={(e) => setSpeechText(e.target.value)}
                  placeholder="Type your speech here or use the microphone button below..."
                  className={`speech-textarea ${isTranscribing ? 'listening' : ''}`}
                />

                {isTranscribing && (
                  <div className="transcribing-indicator">
                    <div className="pulse-dot"></div>
                    Listening... Speak now
                  </div>
                )}
              </div>

              {/* Voice Input Controls */}
              {isSpeechSupported() && (
                <div className="voice-controls">
                  <div className="voice-header">
                    <span className="voice-title">🎤 Voice Input</span>
                    {isListening && (
                      <span className="recording-indicator">
                        🔴 Recording...
                      </span>
                    )}
                  </div>

                  <div className="voice-buttons">
                    <button 
                      onClick={isListening ? stopListening : startListening}
                      disabled={isLoading}
                      className={`voice-btn ${isListening ? 'recording' : 'ready'}`}
                    >
                      {isListening ? '⏹️ Stop Listening' : '🎤 Start Voice Input'}
                    </button>

                    <button
                      onClick={clearText}
                      disabled={!speechText.trim() || isListening}
                      className="clear-btn"
                    >
                      🗑️ Clear Text
                    </button>
                  </div>

                  <div className="voice-tip">
                    💡 Click "Start Voice Input" and speak clearly
                  </div>
                </div>
              )}

              {!isSpeechSupported() && (
                <div className="warning-card">
                  <span>
                    ⚠️ Voice input not supported. Please use Chrome, Edge, or Safari.
                  </span>
                </div>
              )}

              <button
                onClick={analyzeSpeech}
                disabled={!speechText.trim() || isLoading || isListening}
                className="analyze-btn"
              >
                {isLoading ? (
                  <>
                    <div className="btn-spinner"></div>
                    Analyzing Speech...
                  </>
                ) : (
                  <>🚀 Analyze Speech</>
                )}
              </button>

              {speechText.trim() && (
                <div className="ready-indicator">
                  ✅ Ready to analyze {speechText.length} characters
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {currentScreen === 'loading' && (
        <div className="loading-screen">
          <div className="loading-content">
            <div className="main-loader"></div>
            <h2 className="loading-title">Analyzing your speech...</h2>
            <p className="loading-subtitle">Identifying perspectives and generating alternatives</p>
            <div className="loading-dots">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </div>
          </div>
        </div>
      )}

      {/* Results Screen */}
      {currentScreen === 'results' && analysisResult && (
        <div className="screen-container results-screen">
          <div className="glass-container">
            <div className="header-section">
              <h2 className="results-title">Speech Analysis Results</h2>
              <p className="results-subtitle">Exploring multiple perspectives on your content</p>
            </div>

            {/* Category and Demographics */}
            <div className="stats-grid">
              <div className="stat-card">
                <h3 className="stat-title">✅ Detected Category</h3>
                <p className="stat-value">{analysisResult.category}</p>
              </div>
              <div className="stat-card">
                <h3 className="stat-title">🧭 Identified Demographics</h3>
                <div className="demographics-list">
                  {analysisResult.demographics.map((demographic, index) => (
                    <div key={index} className="demographic-item">
                      <span className="demographic-dot"></span>
                      <span>{demographic}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Alternative Speeches - Three Columns */}
            <div className="alternatives-section">
              <h3 className="alternatives-title">🔁 Alternative Perspectives</h3>
              <div className="alternatives-grid">
                {analysisResult.alternateSpeeches.map((alt, index) => (
                  <div key={index} className="alternative-card">
                    <div className="alt-header">
                      <h4 className="alt-demographic">📢 {alt.demographic}</h4>
                      <button
                        onClick={() => playTextToSpeech(alt.speech, getVoiceType(alt.demographic), index)}
                        className={`play-btn ${isPlayingAudio === index ? 'playing' : ''}`}
                        title={isPlayingAudio === index ? 'Pause speech' : 'Play speech'}
                      >
                        {isPlayingAudio === index ? '⏸️' : '▶️'}
                      </button>
                    </div>
                    <p className="alt-speech">{alt.speech}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button onClick={copyResults} className="action-btn primary">
                📋 Copy Results
              </button>

              <button onClick={resetApp} className="action-btn secondary">
                🔁 New Analysis
              </button>
            </div>

            {isPlayingAudio !== null && (
              <div className="audio-status">
                <p>
                  🎵 Playing audio for {analysisResult.alternateSpeeches[isPlayingAudio]?.demographic}...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClarityAI;