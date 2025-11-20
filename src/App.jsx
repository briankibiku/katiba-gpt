import React, { useState, useCallback } from 'react';

// --- Utility Functions ---

/**
 * Custom text formatter to handle newlines and ensure safe rendering.
 * @param {string} text - The input text from the API.
 * @returns {JSX.Element[]} An array of JSX elements (strings and <br /> tags).
 */
const formatText = (text) => {
  if (!text) return [];
  // Split the text by newline character and map them to include <br />
  return text.split('\n').map((line, index, array) => (
    <React.Fragment key={index}>
      {line}
      {/* Add a <br /> tag unless it's the last line */}
      {index < array.length - 1 && <br />}
    </React.Fragment>
  ));
};

// --- Components ---

// A simple loading spinner component using inline SVG
const Loader = () => (
  <svg
    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);


// Three-Dot Loader Component for a chat-like typing indicator
const ThreeDotLoader = () => (
  <div className="flex space-x-1 justify-center items-center h-4">
    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse-slow delay-0"></div>
    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse-slow delay-100"></div>
    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse-slow delay-200"></div>
  </div>
);

// Send Icon (Paper Plane) Component
const SendIcon = (props) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
    </svg>
);

// Main Chat Component
const App = () => {
  // NOTE: This URL is set to your specified local backend endpoint
  const API_URL = 'http://localhost:8000/query';
  const PROD_URL = 'https://katiba-rag.onrender.com/query'  ;

  const [inputQuery, setInputQuery] = useState("");
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleQuerySubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!inputQuery.trim()) {
      setError("Please enter a query.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const payload = { query: inputQuery };
      // Implement exponential backoff for API calls
      const MAX_RETRIES = 5;
      let lastError = null;
      
      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          const res = await fetch(PROD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            if (res.status === 429 && i < MAX_RETRIES - 1) { // Too Many Requests
              const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
              continue; // Retry
            }
            throw new Error(`HTTP error! Status: ${res.status}`);
          }

          const data = await res.json();
          setResponse(data);
          lastError = null;
          setInputQuery(''); 
          break; // Success
        } catch (err) {
          lastError = err;
          if (i < MAX_RETRIES - 1) {
             const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
             await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      if (lastError) {
        throw lastError;
      }

    } catch (err) {
      console.error('API Error:', err);
      // Detailed error message for local development environment
      setError(`Failed to connect to the backend at ${API_URL}. Make sure your local server is running and accessible. Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [inputQuery]);

  // Conditional Rendering of the Response Box
  const ResponseDisplay = () => {
    if (isLoading) {
      return (
        <div className=" p-8  my-6">
          <div className="flex justify-end">
            <div className="bg-indigo-600 text-white p-4 max-w-xl rounded-t-xl rounded-bl-xl shadow-xl">
              <p className="font-medium">{inputQuery}</p>
            </div>
          </div>
          <div className='flex justify-start '>
            <ThreeDotLoader /> 
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 bg-red-800 border border-red-600 text-red-200 rounded-xl shadow-md my-6">
          <p className="font-semibold">Connection Error:</p>
          <p>{error}</p>
        </div>
      );
    } 
    if (response) {
      return (
        <div className="space-y-6">
          {/* User Query Bubble */}
          <div className="flex justify-end">
            <div className="bg-indigo-600 text-white p-4 max-w-xl rounded-t-xl rounded-bl-xl shadow-xl">
              <p className="font-medium">{response.query}</p>
            </div>
          </div>

          {/* AI Response Card */}
          <div className="flex justify-start">
            <div className="bg-slate-700 p-5 max-w-3xl rounded-t-xl rounded-br-xl shadow-2xl border border-indigo-700">
              <h3 className="text-lg font-bold text-indigo-400 mb-3">Katiba GPT</h3>
              <div className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                 {/* Use formatText to handle \n characters */}
                {formatText(response.answer)}
              </div>
              
              {/* Sources */}
              {response.sources && response.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-600 text-sm text-gray-400 italic">
                  <p className="font-semibold text-gray-300 not-italic">Sources:</p>
                  <ul className="list-disc list-inside ml-2">
                    {response.sources.map((source, index) => (
                      <li key={index}>{source}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Initial state message
    // return (
    //   <div className="text-center p-8 bg-slate-800 rounded-xl shadow-md my-6 text-gray-400 border border-indigo-500">
    //     <h3 className='text-xl font-semibold text-indigo-400'>Welcome to Katiba GPT!</h3>
    //     <p className='mt-2'>Your Kenyan Law Question & Answer Interface.</p>
    //     <p className='mt-4 text-sm'>Enter a query and press 'Submit' to receive grounded constitutional information.</p>
    //   </div>
    // );
  };

  return (
    // Global background is set to a deep navy blue (slate-900)
    <div className="min-h-screen bg-slate-900 font-sans flex flex-col items-center p-4 sm:p-8">

       {/* Global Styles (Simulated index.css content) */}
      <style>{`
        /* Custom scrollbar for better aesthetics, styled for a dark theme */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #334155; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #64748b; 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        /* Ensure the main container has the Inter font */
        .font-sans {
          font-family: 'Inter', sans-serif;
        }
        /* Define a slow pulse animation for the dots */
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      
      {/* Header */}
      {/* <header className="w-full max-w-4xl py-6 text-center bg-slate-800 rounded-xl shadow-2xl mb-6">
        <h1 className="text-4xl font-extrabold text-indigo-400 tracking-tight">
          Katiba GPT
        </h1>
        <p className="text-slate-400 mt-1">Kenyan Law Q&A Interface</p>
        
      </header> */}
      <header className="text-center p-8 bg-slate-800 rounded-xl shadow-md  text-gray-400 border border-indigo-500">
        <h3 className='text-xl font-semibold text-indigo-400'>Welcome to Katiba GPT!</h3>
        <p className='mt-2'>Your Kenyan Law Question & Answer Interface.</p> 
      </header>

      {/* Main Chat Area - Reduced height to prioritize input at the bottom */}
      <main className="w-full max-w-4xl flex-grow flex flex-col bg-slate-800 rounded-xl shadow-2xl overflow-hidden mb-6">
        
        {/* Response History */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto h-[60vh] custom-scrollbar flex-grow bg-slate-900">
          <ResponseDisplay />
        </div>

        {/* Input Form - Styled like a floating chat input bar */}
         <form 
          onSubmit={handleQuerySubmit} 
          // Remove top border and adjust padding
          className="w-full p-4 sm:p-6 bg-slate-800"
        >
          <div 
            // This div is the rounded input bar container
            className="relative flex items-center bg-slate-700 rounded-3xl p-1 shadow-2xl border border-slate-600"
          >
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask anything about the Kenyan constitution..." // Concise placeholder like in the image
              // Input styles: padding adjusted, removes border so it blends with the dark container
              className="flex-grow py-3 px-3 bg-slate-700 text-gray-100 rounded-3xl focus:ring-0 focus:border-0 outline-none transition duration-150 placeholder-gray-400 text-base"
              disabled={isLoading}
            />
            
            {/* The circular Send button (replacing the large 'Submit' button) */}
            <button
              type="submit"
              disabled={isLoading}
              // Styling the button to be a circular dark icon, similar to the image
              className={`flex items-center justify-center h-10 w-10 ml-2 rounded-full font-semibold text-white transition duration-200 shadow-lg transform active:scale-95 
                ${isLoading 
                  ? 'bg-indigo-700/50 cursor-not-allowed' // Slightly dimmer when loading
                  : 'bg-indigo-600 hover:bg-indigo-700'}`
              }
              aria-label="Send Query"
            >
              {isLoading ? (
                <Loader className="h-4 w-4" />
              ) : (
                // Rotate the icon slightly to resemble the chat app send button
                <SendIcon className="h-5 w-5 text-white transform -translate-y-px -translate-x-px" />
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default App;