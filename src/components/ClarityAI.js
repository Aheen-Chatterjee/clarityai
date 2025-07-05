import React, { useState, useRef, useEffect } from 'react';

const ClarityAI = () => {
  const [currentScreen, setCurrentScreen] = useState('intro');
  const [speechText, setSpeechText] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasUserVoice, setHasUserVoice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isUploadingVoice, setIsUploadingVoice] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const recordingTimerRef = useRef(null);

  // Replace with your Render URL
  const API_URL = 'http://localhost:8000';

  useEffect(() => {
    // Show intro screen for 3 seconds
    const timer = setTimeout(() => {
      setCurrentScreen('input');
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        await cloneVoice(audioBlob);
        stream.getTracks().forEach(track => track.stop());
        
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      showError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const transcribeAudio = async (audioBlob) => {
    // Use browser's Web Speech API instead of backend transcription
    setIsTranscribing(true);
    
    try {
      // Check if Web Speech API is available
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showError('Speech recognition not supported in this browser');
        setIsTranscribing(false);
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      // Create audio URL and play it for recognition
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setSpeechText(transcript);
        setIsTranscribing(false);
        URL.revokeObjectURL(audioUrl);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        showError('Speech recognition failed. Please try typing your text instead.');
        setIsTranscribing(false);
        URL.revokeObjectURL(audioUrl);
      };

      recognition.onend = () => {
        setIsTranscribing(false);
        URL.revokeObjectURL(audioUrl);
      };

      // Start recognition
      recognition.start();
      
      // Play the recorded audio to help with recognition context
      audio.play().catch(console.error);
      
    } catch (error) {
      console.error('Transcription setup error:', error);
      showError('Speech recognition setup failed');
      setIsTranscribing(false);
    }
  };

  const cloneVoice = async (audioBlob) => {
    setIsUploadingVoice(true);
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'voice.webm');

      const response = await fetch(`${API_URL}/clone-voice`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setHasUserVoice(true);
      }
    } catch (error) {
      console.log('Voice cloning failed');
    } finally {
      setIsUploadingVoice(false);
    }
  };

  const analyzeSpeech = async () => {
    if (!speechText.trim()) {
      showError('Please enter some text');
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
        showError('Analysis failed');
        setCurrentScreen('input');
      }
    } catch (error) {
      showError('Analysis failed');
      setCurrentScreen('input');
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (text) => {
    setIsGeneratingAudio(true);
    try {
      const response = await fetch(`${API_URL}/generate-audio?text=${encodeURIComponent(text)}&use_user_voice=${hasUserVoice}`, {
        method: 'POST',
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.onended = () => {
            URL.revokeObjectURL(audioUrl);
          };
          audioRef.current.play();
        }
      } else {
        showError('Audio generation failed');
      }
    } catch (error) {
      showError('Audio generation failed');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const resetApp = () => {
    setSpeechText('');
    setAnalysisResult(null);
    setHasUserVoice(false);
    setError('');
    setRecordingTime(0);
    setCurrentScreen('input');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div>
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
                Enter your speech or talking points
              </label>
              <textarea
                value={speechText}
                onChange={(e) => setSpeechText(e.target.value)}
                placeholder="Paste your speech here or record audio below..."
                className="textarea"
                disabled={isTranscribing}
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
                  Transcribing audio...
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Recording Section */}
              <div style={{
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                padding: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem'
                }}>
                  <span className="font-medium text-gray-700">Voice Recording</span>
                  {isRecording && (
                    <span style={{
                      color: '#dc2626',
                      fontFamily: 'monospace',
                      fontWeight: 'bold'
                    }}>
                      🔴 {formatTime(recordingTime)}
                    </span>
                  )}
                </div>
                
                <div className="flex gap-4">
                  <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing || isUploadingVoice}
                    className={`btn btn-full ${isRecording ? 'btn-danger' : 'btn-primary'}`}
                    style={{
                      backgroundColor: isRecording ? '#dc2626' : '#3b82f6',
                      color: 'white',
                      transform: isRecording ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: isRecording ? '0 0 20px rgba(220, 38, 38, 0.3)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isRecording ? '🔴 Stop Recording' : '🎤 Start Recording'}
                  </button>
                </div>
                
                {isUploadingVoice && (
                  <div className="text-center text-blue-600 font-medium" style={{ marginTop: '0.75rem' }}>
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
                    Processing voice...
                  </div>
                )}
                
                {hasUserVoice && (
                  <div className="text-center text-green-600 font-medium" style={{ 
                    marginTop: '0.75rem',
                    fontSize: '0.875rem'
                  }}>
                    ✅ Your voice is ready for AI speech generation!
                  </div>
                )}
              </div>

              {/* Analysis Button */}
              <button
                onClick={analyzeSpeech}
                disabled={!speechText.trim() || isLoading || isTranscribing}
                className="btn btn-primary btn-full"
                style={{
                  background: !speechText.trim() || isLoading || isTranscribing 
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
            </div>
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
                    marginBottom: '0.5rem'
                  }}>
                    <h4 className="font-semibold text-gray-900">📢 {alt.demographic}</h4>
                    <button
                      onClick={() => playAudio(alt.speech)}
                      disabled={isGeneratingAudio}
                      className="btn"
                      style={{
                        backgroundColor: isGeneratingAudio ? '#fbbf24' : '#3b82f6',
                        color: 'white',
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isGeneratingAudio ? '⏳' : '🔊'}
                    </button>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">{alt.speech}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-center gap-4 pt-4">
            <button
              onClick={() => playAudio(speechText)}
              disabled={isGeneratingAudio}
              className="btn btn-success transition-colors"
              style={{
                backgroundColor: isGeneratingAudio ? '#fbbf24' : '#22c55e',
                color: 'white'
              }}
            >
              {isGeneratingAudio ? '⏳ Generating...' : '🔊 Play Original'}
            </button>
            
            <button
              onClick={resetApp}
              className="btn btn-secondary transition-colors"
            >
              🔁 New Analysis
            </button>
          </div>

          {isGeneratingAudio && (
            <div className="text-center">
              <p className="text-blue-600 font-medium">
                🎵 Generating audio with {hasUserVoice ? 'your voice' : "default voice"}...
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