import React, { useState, useRef } from 'react';

const ClarityAI = () => {
  const [currentScreen, setCurrentScreen] = useState('input');
  const [speechText, setSpeechText] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasUserVoice, setHasUserVoice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  //TODO: replace with actual render url
  const API_URL = 'https://clarityai2backend.onrender.com';

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(''), 5000);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await transcribeAudio(audioBlob);
        await cloneVoice(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      showError('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.wav');

      const response = await fetch(`${API_URL}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setSpeechText(result.text);
      }
    } catch (error) {
      showError('Transcription failed');
    }
  };

  const cloneVoice = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'voice.wav');

      const response = await fetch(`${API_URL}/clone-voice`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setHasUserVoice(true);
      }
    } catch (error) {
      console.log('Voice cloning failed');
    }
  };

  const analyzeSpeech = async () => {
    if (!speechText.trim()) {
      showError('Please enter some text');
      return;
    }

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
      }
    } catch (error) {
      showError('Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (text) => {
    try {
      const response = await fetch(`${API_URL}/generate-audio?text=${encodeURIComponent(text)}&use_user_voice=${hasUserVoice}`, {
        method: 'POST',
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        }
      }
    } catch (error) {
      showError('Audio generation failed');
    }
  };

  const resetApp = () => {
    setSpeechText('');
    setAnalysisResult(null);
    setHasUserVoice(false);
    setCurrentScreen('input');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <audio ref={audioRef} />
      
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50">
          {error}
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">
          ClarityAI MVP
        </h1>

        {currentScreen === 'input' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-6">
              <label className="block text-lg font-semibold mb-2">
                Enter your speech or record audio:
              </label>
              <textarea
                value={speechText}
                onChange={(e) => setSpeechText(e.target.value)}
                placeholder="Type your speech here..."
                className="w-full p-4 border rounded-lg h-32 resize-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-4 mb-6">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`flex-1 py-3 px-6 rounded-lg font-semibold ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isRecording ? '🔴 Stop Recording' : '🎤 Record Audio'}
              </button>

              <button
                onClick={analyzeSpeech}
                disabled={!speechText.trim() || isLoading}
                className="flex-1 py-3 px-6 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg font-semibold"
              >
                {isLoading ? 'Analyzing...' : '🚀 Analyze Speech'}
              </button>
            </div>

            {hasUserVoice && (
              <div className="text-center text-green-600 font-semibold">
                ✅ Your voice is ready for playback!
              </div>
            )}
          </div>
        )}

        {currentScreen === 'results' && analysisResult && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Analysis Results</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h3 className="font-semibold text-lg text-blue-600">Category</h3>
                  <p className="text-gray-700">{analysisResult.category}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-blue-600">Demographics</h3>
                  <p className="text-gray-700">{analysisResult.demographics.join(', ')}</p>
                </div>
              </div>

              <h3 className="font-semibold text-lg mb-4">Alternative Speeches</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysisResult.alternateSpeeches.map((alt, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-purple-600">{alt.demographic}</h4>
                      <button
                        onClick={() => playAudio(alt.speech)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        🔊 Play
                      </button>
                    </div>
                    <p className="text-gray-700 text-sm">{alt.speech}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={resetApp}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold"
                >
                  🔄 New Analysis
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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