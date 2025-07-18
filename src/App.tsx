import React, { useState, useEffect } from 'react';

const anecdoteData: { [key: string]: { capital: string; anecdote: string; isoCode: string } } = {
  'Germany': { capital: 'Berlin', anecdote: 'Berlin has more bridges than Venice, with an estimated 1,700 of them.', isoCode: 'de' },
  'Russia': { capital: 'Moscow', anecdote: 'The Moscow Kremlin is the largest active medieval fortress in the world.', isoCode: 'ru' },
  'England': { capital: 'London', anecdote: 'London is the first city to have hosted the Summer Olympics three times.', isoCode: 'gb' },
  'United States': { capital: 'Washington, D.C.', anecdote: 'Washington, D.C. was the first planned capital in the United States.', isoCode: 'us' },
  'France': { capital: 'Paree', anecdote: 'The Eiffel Tower can be 15 cm taller during the summer.', isoCode: 'fr' },
  'Japan': { capital: 'Tokyo', anecdote: 'Tokyo is the world\'s most populous metropolitan area.', isoCode: 'jp' },
  'Luxembourg': { capital: 'Luxembourg City', anecdote: 'It is the only remaining Grand Duchy in the world.', isoCode: 'lu' },
  'Burkina Faso': { capital: 'Ouagadougou', anecdote: 'Its name translates to "Land of Incorruptible People".', isoCode: 'bf' },
  'Bhutan': { capital: 'Thimphu', anecdote: 'It is the only country in the world to measure progress by Gross National Happiness.', isoCode: 'bt' },
  'Kyrgyzstan': { capital: 'Bishkek', anecdote: 'Bishkek is one of the greenest cities in Central Asia.', isoCode: 'kg' },
  'Palestine': { capital: 'Ramallah', anecdote: 'Ramallah hosts a vibrant cultural scene and is known for its many international music and film festivals.', isoCode: 'ps' },
  'Samoa': { capital: 'Apia', anecdote: 'In Samoa, it is considered a sign of respect to raise your eyebrows to say yes.', isoCode: 'ws' },
};


const countriesList = Object.keys(anecdoteData);

function detectCountries(text: string): string[] {
  const detected = countriesList.filter(country =>
    new RegExp(`\\b${country}\\b`, 'i').test(text)
  );
  // Special case for Gaza -> Palestine
  if (new RegExp(`\\bGaza\\b`, 'i').test(text) && !detected.includes('Palestine')) {
    detected.push('Palestine');
  }
  return detected;
}

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [anecdotes, setAnecdotes] = useState<{ country: string; capital: string; anecdote: string; isoCode: string }[]>([]);
  const [error, setError] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const recognitionRef = React.useRef<any>(null);
  const transcriptRef = React.useRef(transcript);
  transcriptRef.current = transcript;

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        const defaultVoice = availableVoices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
        if (defaultVoice) {
          setSelectedVoice(defaultVoice.name);
        }
      }
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }, []);

  const processTranscript = () => {
    setTimeout(() => {
      const detected = detectCountries(transcriptRef.current);
      const fetchedAnecdotes = detected
        .map(country => ({ country, ...anecdoteData[country] }))
        .filter(item => item.anecdote && item.capital);

      setAnecdotes(fetchedAnecdotes);
      setIsLoading(false);

      if ('speechSynthesis' in window && fetchedAnecdotes.length > 0) {
        const fullText = fetchedAnecdotes
          .map(item => `An interesting fact about ${item.capital}, the capital of ${item.country}, is that ${item.anecdote}`)
          .join('. ');
        const utterance = new SpeechSynthesisUtterance(fullText);
        const voice = voices.find(v => v.name === selectedVoice);
        if (voice) {
          utterance.voice = voice;
        }
        window.speechSynthesis.speak(utterance);
      }
    }, 1500);
  };

  const handleRecord = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    setError('');
    setTranscript('');
    setAnecdotes([]);
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const currentTranscript = Array.from(event.results)
        .map((result: any) => result[0])
        .map(result => result.transcript)
        .join('');
      setTranscript(currentTranscript);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setIsLoading(true);
      processTranscript();
    };

    recognition.onerror = (event: any) => {
      setError('Error recognizing speech: ' + event.error);
      setIsRecording(false);
    };

    recognition.start();
    setIsRecording(true);
  };

  const getButtonText = () => {
    if (isRecording) return 'Stop Recording';
    if (isLoading) return 'Analyzing...';
    return 'Record Voice';
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 600, margin: '40px auto', padding: 24, borderRadius: 12, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
      <h1>Country Anecdote Demo</h1>
      <button onClick={handleRecord} disabled={isLoading} style={{ fontSize: 18, padding: '12px 28px', borderRadius: 8, marginBottom: 16 }}>
        {getButtonText()}
      </button>

      {voices.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <label htmlFor="voice-select" style={{ marginRight: 8, fontSize: 16 }}>Choose a voice:</label>
          <select
            id="voice-select"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            style={{ fontSize: 16, padding: '8px 12px', borderRadius: 8 }}
          >
            {voices.filter(v => v.lang.startsWith('en')).map(voice => (
              <option key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </option>
            ))}
          </select>
        </div>
      )}

      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}

      {isLoading && (
        <div style={{ margin: '24px 0', textAlign: 'center', fontSize: 18, color: '#666' }}>
          <p>Analyzing your speech, please wait...</p>
        </div>
      )}

      {transcript && !isLoading && (
        <div style={{ margin: '16px 0' }}>
          <strong>Your input:</strong> <em>{transcript}</em>
        </div>
      )}

      {anecdotes.length > 0 && !isLoading && (
        <div style={{ margin: '24px 0' }}>
          {anecdotes.map(item => (
            <div key={item.country} style={{ marginBottom: 20, display: 'flex', alignItems: 'center' }}>
              <img src={`https://flagcdn.com/w40/${item.isoCode}.png`} alt={`${item.country} flag`} style={{ marginRight: 16, borderRadius: 4 }} />
              <div>
                <h3 style={{ marginBottom: 4 }}>{item.capital} ({item.country})</h3>
                <p style={{ margin: 0 }}>{item.anecdote}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
