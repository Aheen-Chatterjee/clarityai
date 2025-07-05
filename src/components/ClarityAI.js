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

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // Replace with your Render URL
  const API_URL = 'https://clarityai2backend.onrender.com';

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

        // Update speech text with final results
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

  useEffect(() => {
    // Show intro screen for 3 seconds
    const timer = setTimeout(() => {
      setCurrentScreen('input');
    }, 3000);

    // Initialize Web Speech API
    initializeSpeechRecognition();

    return () => clearTimeout(timer);
  }, [initializeSpeechRecognition]);

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

  // Text-to-Speech using ResponsiveVoice API (free)
  const playTextToSpeech = async (text, voiceType = 'default', speechIndex = null) => {
    setIsPlayingAudio(speechIndex);

    try {
      // Define different voices for different perspectives
      const voices = {
        'progressive': 'UK English Female',
        'conservative': 'UK English Male',
        'moderate': 'US English Female',
        'default': 'US English Male'
      };

      const voiceName = voices[voiceType] || voices['default'];

      // Check if ResponsiveVoice is available
      if (typeof window.responsiveVoice !== 'undefined') {
        window.responsiveVoice.speak(text, voiceName, {
          rate: 0.9,
          pitch: 1,
          volume: 0.8,
          onend: () => {
            setIsPlayingAudio(null);
          },
          onerror: () => {
            setIsPlayingAudio(null);
            // Fallback to browser TTS
            fallbackToSpeechSynthesis(text);
          }
        });
      } else {
        // Fallback to browser's built-in speech synthesis
        fallbackToSpeechSynthesis(text);
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsPlayingAudio(null);
      showError('Text-to-speech failed');
    }
  };

  // Fallback TTS using browser's Speech Synthesis API
  const fallbackToSpeechSynthesis = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
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
    <div>
      {/* Load ResponsiveVoice API */}
      {typeof window !== 'undefined' && (
        <script src="https://code.responsivevoice.org/responsivevoice.js?key=FREE_TRIAL_KEY"></script>
      )}

      <audio ref={audioRef} />
      
      {/* Error Toast */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          backgroundColor: '#dc2626',
          color: 'white',
          padding: '1rem',
          borderRadius: '0.5rem',
          zIndex: 50,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Intro Screen with Bouncing Animation */}
      {currentScreen === 'intro' && (
        <div className="intro-screen">
          <div className="text-center">
            <h1 className="intro-title font-times">
              Clarity
            </h1>
            <div style={{ animation: 'bounce 1s infinite' }}>
              <div style={{
                width: '4rem',
                height: '4rem',
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                margin: '0 auto'
              }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Input Screen */}
      {currentScreen === 'input' && (
        <div className="container-sm">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-bold text-gray-900 font-times">
              Clarity
            </h1>
            <p className="text-xl text-gray-600 font-medium">
              Analyze your speech and explore alternative perspectives
            </p>
          </div>

          <div className="card space-y-6">
            <div className="space-y-4">
              <label className="text-lg font-semibold text-gray-900">
                Enter your speech or use voice input
              </label>
              <textarea
                value={speechText}
                onChange={(e) => setSpeechText(e.target.value)}
                placeholder="Type your speech here or use the microphone button below..."
                className="textarea"
                style={{
                  minHeight: '150px',
                  borderColor: isTranscribing ? '#3b82f6' : '#e5e7eb'
                }}
              />
              
              {isTranscribing && (
                <div className="text-center text-blue-600 font-medium">
                  <div style={{
                    display: 'inline-block',
                    width: '1rem',
                    height: '1rem',
                    border: '2px solid #2563eb',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '0.5rem'
                  }}></div>
                  Listening... Speak now
                </div>
              )}
            </div>

            {/* Voice Input Controls */}
            {isSpeechSupported() && (
              <div style={{
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                padding: '1rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem'
                }}>
                  <span className="font-medium text-gray-700">🎤 Voice Input</span>
                  {isListening && (
                    <span style={{
                      color: '#dc2626',
                      fontWeight: 'bold',
                      animation: 'pulse 1s infinite'
                    }}>
                      🔴 Recording...
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading}
                    className="btn"
                    style={{
                      backgroundColor: isListening ? '#dc2626' : '#3b82f6',
                      color: 'white',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem',
                      transform: isListening ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: isListening ? '0 0 20px rgba(220, 38, 38, 0.3)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isListening ? '🔴 Stop Listening' : '🎤 Start Voice Input'}
                  </button>
                  
                  <button
                    onClick={clearText}
                    disabled={!speechText.trim() || isListening}
                    className="btn"
                    style={{
                      backgroundColor: '#6b7280',
                      color: 'white',
                      padding: '0.75rem 1rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    🗑️ Clear Text
                  </button>
                </div>
                
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                  💡 Tip: Click "Start Voice Input" and speak clearly. Your speech will be converted to text automatically.
                </div>
              </div>
            )}

            {!isSpeechSupported() && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '0.5rem',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <span style={{ color: '#92400e', fontSize: '0.875rem' }}>
                  ⚠️ Voice input not supported in this browser. Please use Chrome, Edge, or Safari for voice features.
                </span>
              </div>
            )}

            <button
              onClick={analyzeSpeech}
              disabled={!speechText.trim() || isLoading || isListening}
              className="btn btn-primary btn-full"
              style={{
                background: !speechText.trim() || isLoading || isListening
                  ? '#9ca3af' 
                  : 'linear-gradient(to right, #3b82f6, #9333ea)',
                color: 'white',
                padding: '1rem 1.5rem',
                fontSize: '1.125rem',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    display: 'inline-block',
                    width: '1.25rem',
                    height: '1.25rem',
                    border: '2px solid white',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '0.5rem'
                  }}></div>
                  Analyzing Speech...
                </>
              ) : (
                <>🚀 Analyze Speech</>
              )}
            </button>

            {speechText.trim() && (
              <div style={{
                backgroundColor: '#f0f9ff',
                border: '1px solid #0ea5e9',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                textAlign: 'center',
                fontSize: '0.875rem',
                color: '#0c4a6e'
              }}>
                ✅ Ready to analyze {speechText.length} characters of text
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading Screen */}
      {currentScreen === 'loading' && (
        <div className="loading-container flex-center flex-col space-y-4 text-center">
          <div className="loader"></div>
          <div className="space-y-4">
            <p className="text-xl font-semibold text-gray-900">Analyzing your speech...</p>
            <p className="text-sm text-gray-600">Identifying perspectives and generating alternatives</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem', marginTop: '1rem' }}>
              <div style={{
                width: '0.5rem',
                height: '0.5rem',
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'bounce 1s infinite'
              }}></div>
              <div style={{
                width: '0.5rem',
                height: '0.5rem',
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'bounce 1s infinite',
                animationDelay: '0.1s'
              }}></div>
              <div style={{
                width: '0.5rem',
                height: '0.5rem',
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'bounce 1s infinite',
                animationDelay: '0.2s'
              }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Results Screen */}
      {currentScreen === 'results' && analysisResult && (
        <div className="container space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">
              Speech Analysis Results
            </h2>
            <p className="text-gray-600">Exploring multiple perspectives on your content</p>
          </div>

          {/* Category and Demographics */}
          <div className="grid-2">
            <div className="card-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                ✅ Detected Category
              </h3>
              <p className="text-blue-600 text-lg font-medium">{analysisResult.category}</p>
            </div>
            <div className="card-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                🧭 Identified Demographics
              </h3>
              <div className="space-y-2">
                {analysisResult.demographics.map((demographic, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      width: '0.5rem',
                      height: '0.5rem',
                      backgroundColor: '#3b82f6',
                      borderRadius: '50%',
                      marginRight: '0.75rem'
                    }}></span>
                    <span className="text-gray-700 font-medium">{demographic}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alternative Speeches */}
          <div className="card-sm">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">🔁 Alternative Perspectives</h3>
            <div className="grid-3">
              {analysisResult.alternateSpeeches.map((alt, index) => (
                <div key={index} className="card-xs bg-gray-50 border transition-shadow hover-shadow">
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '0.75rem' 
                  }}>
                    <h4 className="font-semibold text-purple-600 text-lg">📢 {alt.demographic}</h4>
                    <button
                      onClick={() => playTextToSpeech(alt.speech, getVoiceType(alt.demographic), index)}
                      disabled={isPlayingAudio !== null}
                      className="btn"
                      style={{
                        backgroundColor: isPlayingAudio === index ? '#fbbf24' : '#3b82f6',
                        color: 'white',
                        padding: '0.5rem',
                        fontSize: '0.875rem',
                        minWidth: '2.5rem'
                      }}
                    >
                      {isPlayingAudio === index ? '⏸️' : '🔊'}
                    </button>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{alt.speech}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-center gap-4 pt-4">
            <button
              onClick={copyResults}
              className="btn btn-primary transition-colors"
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '0.75rem 1.5rem'
              }}
            >
              📋 Copy Results
            </button>
            
            <button
              onClick={resetApp}
              className="btn btn-secondary transition-colors"
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                padding: '0.75rem 1.5rem'
              }}
            >
              🔁 New Analysis
            </button>
          </div>

          {isPlayingAudio !== null && (
            <div className="text-center">
              <p className="text-blue-600 font-medium">
                🎵 Playing audio for {analysisResult.alternateSpeeches[isPlayingAudio]?.demographic}...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClarityAI;


// import React, { useState, useEffect } from 'react';

// const ClarityAI = () => {
//   const [currentScreen, setCurrentScreen] = useState('intro');
//   const [speechInput, setSpeechInput] = useState('');
//   const [analysisData, setAnalysisData] = useState(null);

//   useEffect(() => {
//     // Show intro screen for 3 seconds
//     const timer = setTimeout(() => {
//       setCurrentScreen('input');
//     }, 3000);

//     return () => clearTimeout(timer);
//   }, []);

//   const startAnalysis = () => {
//     if (!speechInput.trim()) {
//       alert('Please enter some speech text to analyze');
//       return;
//     }

//     setCurrentScreen('loading');
    
//     // Simulate API call with mock data
//     setTimeout(() => {
//       const mockData = {
//         category: 'Economics',
//         viewpoints: ['Marxian', 'Keynesian', 'Adam Smith School'],
//         alternateSpeeches: [
//           {
//             type: 'Marxian',
//             content: 'The economic struggle stems from class disparities and requires collective action to redistribute wealth and power to the working class.'
//           },
//           {
//             type: 'Keynesian', 
//             content: 'Government spending is essential to stabilize economic fluctuations and maintain full employment through strategic fiscal policy.'
//           },
//           {
//             type: 'Adam Smith',
//             content: 'Free markets will regulate themselves through invisible hands, promoting efficiency and prosperity when left unencumbered.'
//           }
//         ],
//         pros: ['Strong call to action', 'Clear structure', 'Compelling rhetoric'],
//         cons: ['Lacks nuance', 'Overly idealistic', 'Missing counterarguments'],
//         politicalImpact: 'This speech may resonate with progressives but alienate fiscal conservatives.',
//         framingDifferences: [
//           { perspective: 'Left', framing: 'Peaceful activists demand economic justice' },
//           { perspective: 'Right', framing: 'Radicals threaten free market principles' },
//           { perspective: 'Center', framing: 'Citizens debate economic policy approaches' },
//           { perspective: 'Reddit', framing: 'Just more Monday economic chaos 💀' }
//         ]
//       };
      
//       setAnalysisData(mockData);
//       setCurrentScreen('analysis');
//     }, 2500);
//   };

//   const resetAnalysis = () => {
//     setSpeechInput('');
//     setAnalysisData(null);
//     setCurrentScreen('input');
//   };

//   const copyResults = () => {
//     if (!analysisData) return;
    
//     const resultsText = `
// ClarityAI Analysis Results
// ========================

// Category: ${analysisData.category}
// Viewpoints: ${analysisData.viewpoints.join(', ')}

// Pros: ${analysisData.pros.join(', ')}
// Cons: ${analysisData.cons.join(', ')}

// Political Impact: ${analysisData.politicalImpact}

// Alternative Perspectives:
// ${analysisData.alternateSpeeches.map(speech => `${speech.type}: ${speech.content}`).join('\n')}

// Framing Differences:
// ${analysisData.framingDifferences.map(frame => `${frame.perspective}: ${frame.framing}`).join('\n')}
//     `.trim();
    
//     navigator.clipboard.writeText(resultsText).then(() => {
//       alert('Results copied to clipboard!');
//     }).catch(() => {
//       alert('Failed to copy to clipboard');
//     });
//   };

//   const speakResults = () => {
//     if (!analysisData) return;
    
//     if ('speechSynthesis' in window) {
//       const utterance = new SpeechSynthesisUtterance(analysisData.politicalImpact);
//       utterance.rate = 0.8;
//       utterance.pitch = 1;
//       window.speechSynthesis.speak(utterance);
//     } else {
//       alert('Speech synthesis not supported in this browser');
//     }
//   };

//   const handleRecordSpeech = () => {
//     // Placeholder for future speech recording implementation
//     alert('Speech recording feature coming soon!');
//   };

//   return (
//     <div>
//       {/* Intro Screen */}
//       {currentScreen === 'intro' && (
//         <div className="intro-screen flex-center">
//           <h1 className="intro-title font-times">
//             Clarity
//           </h1>
//         </div>
//       )}

//       {/* Input Screen */}
//       {currentScreen === 'input' && (
//         <div className="container-sm space-y-8">
//           <div className="text-center space-y-4">
//             <h1 className="text-5xl font-bold text-gray-900 font-times">
//               Clarity
//             </h1>
//             <p className="text-xl text-gray-600 font-medium">
//               Analyze your speech and explore alternative perspectives
//             </p>
//           </div>

//           <div className="card space-y-6">
//             <div className="space-y-4">
//               <label className="text-lg font-semibold text-gray-900">
//                 Enter your speech or talking points
//               </label>
//               <textarea
//                 value={speechInput}
//                 onChange={(e) => setSpeechInput(e.target.value)}
//                 placeholder="Paste your speech here..."
//                 className="textarea"
//               />
//             </div>

//             <div className="flex gap-4">
//               <button 
//                 onClick={handleRecordSpeech}
//                 className="btn btn-secondary btn-full"
//               >
//                 🎤 Record Speech
//               </button>
//               <button
//                 onClick={startAnalysis}
//                 className="btn btn-primary btn-full"
//               >
//                 🚀 Analyze Speech
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Loading Screen */}
//       {currentScreen === 'loading' && (
//         <div className="loading-container flex-center flex-col space-y-4 text-center">
//           <div className="loader"></div>
//           <p className="text-lg font-medium">Analyzing your speech...</p>
//           <p className="text-sm text-gray-500">Identifying perspectives and generating alternatives</p>
//         </div>
//       )}

//       {/* Analysis Screen */}
//       {currentScreen === 'analysis' && analysisData && (
//         <div className="container space-y-8">
//           <div className="text-center space-y-4">
//             <h2 className="text-3xl font-bold text-gray-900">
//               Speech Analysis Results
//             </h2>
//             <p className="text-gray-600">Exploring multiple perspectives on your content</p>
//           </div>

//           {/* Category and Viewpoints */}
//           <div className="grid grid-2">
//             <div className="card-sm">
//               <h3 className="text-xl font-semibold text-gray-900 mb-2">
//                 ✅ Detected Category
//               </h3>
//               <p className="text-blue-600 text-lg font-medium">{analysisData.category}</p>
//             </div>
//             <div className="card-sm">
//               <h3 className="text-xl font-semibold text-gray-900 mb-2">
//                 🧭 Identified Viewpoints
//               </h3>
//               <ul className="list-disc text-gray-700 space-y-4">
//                 {analysisData.viewpoints.map((viewpoint, index) => (
//                   <li key={index} className="list-item font-medium">{viewpoint}</li>
//                 ))}
//               </ul>
//             </div>
//           </div>

//           {/* Alternate Speeches */}
//           <div className="card-sm">
//             <h3 className="text-xl font-semibold mb-4 text-gray-900">🔁 Alternative Perspectives</h3>
//             <div className="grid grid-3">
//               {analysisData.alternateSpeeches.map((speech, index) => (
//                 <div key={index} className="card-xs bg-gray-50 border transition-shadow hover-shadow">
//                   <div className="font-semibold text-gray-900 mb-2">
//                     📢 {speech.type}
//                   </div>
//                   <p className="text-gray-700 text-sm leading-relaxed">{speech.content}</p>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Pros, Cons, and Impact */}
//           <div className="grid grid-3">
//             <div className="card-xs">
//               <h4 className="font-semibold mb-3 text-green-600 text-lg">✅ Strengths</h4>
//               <ul className="list-disc text-gray-700 space-y-4">
//                 {analysisData.pros.map((pro, index) => (
//                   <li key={index} className="list-item text-sm">{pro}</li>
//                 ))}
//               </ul>
//             </div>
//             <div className="card-xs">
//               <h4 className="font-semibold mb-3 text-red-600 text-lg">❌ Weaknesses</h4>
//               <ul className="list-disc text-gray-700 space-y-4">
//                 {analysisData.cons.map((con, index) => (
//                   <li key={index} className="list-item text-sm">{con}</li>
//                 ))}
//               </ul>
//             </div>
//             <div className="card-xs">
//               <h4 className="font-semibold mb-3 text-purple-600 text-lg">
//                 🧠 Political Impact
//               </h4>
//               <p className="text-gray-700 text-sm leading-relaxed">{analysisData.politicalImpact}</p>
//             </div>
//           </div>

//           {/* Framing Differences */}
//           <div className="card-sm">
//             <h3 className="text-xl font-semibold mb-4 text-gray-900">🪞 How Different Groups Frame This</h3>
//             <div className="grid grid-2">
//               {analysisData.framingDifferences.map((framing, index) => (
//                 <div key={index} className="card-xs bg-gray-50 rounded-lg">
//                   <span className="font-semibold text-gray-900">{framing.perspective}:</span>{' '}
//                   <span className="text-gray-700 italic">"{framing.framing}"</span>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Action Buttons */}
//           <div className="flex-center gap-4 pt-4">
//             <button
//               onClick={copyResults}
//               className="btn btn-primary transition-colors"
//             >
//               📋 Copy Results
//             </button>
//             <button
//               onClick={resetAnalysis}
//               className="btn btn-secondary transition-colors"
//             >
//               🔁 New Analysis
//             </button>
//             <button
//               onClick={speakResults}
//               className="btn btn-success transition-colors"
//             >
//               🔊 Read Aloud
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ClarityAI;