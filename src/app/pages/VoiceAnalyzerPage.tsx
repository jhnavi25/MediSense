import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Mic, MicOff, FileText, Brain } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { analyzeVoice, type VoiceAnalysisResult } from "../api/voice";

export function VoiceAnalyzerPage() {
  const { t } = useTranslation();
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState("");
  const [analysisResult, setAnalysisResult] = useState<VoiceAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("auto");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const supported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    setSpeechRecognitionSupported(supported);
    if (!supported) {
      setRecordError("Speech recognition is unavailable in this browser. Please use Google Chrome or Apple Safari for voice transcription.");
    }
  }, []);

  const startRecording = async () => {
    if (!speechRecognitionSupported) {
      setRecordError("Voice transcription is unsupported in this browser. Please use Google Chrome or Apple Safari.");
      return;
    }

    setRecordError(null);
    setAnalysisError(null);
    setTranscript("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setAudioBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAnalysisResult(null);

      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = selectedLanguage === "auto" ? "" : selectedLanguage;

        let fullTranscript = "";

        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const result = event.results[i];
            const text = result[0].transcript;
            if (result.isFinal) {
              fullTranscript += text + " ";
            } else {
              interimTranscript += text;
            }
          }
          setTranscript(fullTranscript + interimTranscript);
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setRecordError(`Speech recognition error: ${event.error}`);
          setIsRecording(false);
        };

        recognition.onend = () => {
          if (isRecording) {
            try {
              recognition.start();
            } catch (err) {
              console.error("Failed to restart recognition:", err);
            }
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (err) {
      console.error("Microphone access failed", err);
      setRecordError("Microphone access denied or unavailable. Please allow microphone access and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setHasRecording(true);
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleAnalyze = async () => {
    if (!audioBlob && !transcript) {
      setAnalysisError("No recording or transcript available. Please record again.");
      return;
    }

    setAnalysisError(null);
    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const detectedLanguage = recognitionRef.current?.lang || selectedLanguage || "auto";
      const result = await analyzeVoice(audioBlob || new Blob(), detectedLanguage, transcript);
      setAnalysisResult(result);
    } catch (err) {
      console.error("Analysis failed", err);
      setAnalysisError("Analysis failed. Please check your connection and try again, or record again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const isVoiceSupported = speechRecognitionSupported === true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 relative">
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23047857' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v6h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-block bg-gradient-to-r from-blue-600 to-emerald-600 text-white px-6 py-2 rounded-full text-sm font-bold mb-6 shadow-lg">
            {t("voice.aiVoiceAnalysis")}
          </div>
          <h1 className="text-5xl font-bold text-slate-800 mb-4">{t("voice.voiceSymptomAnalyzer")}</h1>
          <p className="text-xl text-slate-600">{t("voice.voiceSymptomDesc")}</p>
        </div>

        {speechRecognitionSupported === false && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <p className="font-semibold">Browser unsupported for speech transcription</p>
            <p className="mt-2 text-sm">
              This page requires the Web Speech API. Please use Google Chrome or Apple Safari for the best experience.
            </p>
          </div>
        )}

        <Card className="border-2 border-emerald-100 shadow-2xl mb-12">
          <CardContent className="p-12">
            <div className="flex flex-col items-center">
              <div className="mb-6 w-full max-w-2xl">
                <label className="block text-sm font-medium text-slate-700 mb-2">{t("voice.selectLanguage") || "Select language"}</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  disabled={isRecording}
                >
                  <option value="auto">Auto-detect</option>
                  <option value="en-US">English (US)</option>
                  <option value="es-ES">Español</option>
                  <option value="fr-FR">Français</option>
                  <option value="hi-IN">?????? (Hindi)</option>
                  <option value="zh-CN">?? (Chinese)</option>
                  <option value="ar-SA">??????? (Arabic)</option>
                </select>
              </div>

              <button
                onClick={toggleRecording}
                disabled={!isVoiceSupported || analyzing}
                className={`relative mb-8 inline-flex items-center justify-center rounded-full px-8 py-8 text-white shadow-2xl transition-all duration-300 ${isVoiceSupported ? "hover:scale-105" : "cursor-not-allowed opacity-70"}`}
              >
                <div className={`absolute inset-0 rounded-full ${isRecording ? "bg-red-300 opacity-80" : "bg-gradient-to-r from-blue-500 to-emerald-500 opacity-90"}`} />
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-slate-900 text-white">
                  {isRecording ? <MicOff className="size-16" /> : <Mic className="size-16" />}
                </div>
              </button>

              {recordError && (
                <div className="mb-6 w-full max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                  {recordError}
                </div>
              )}

              <div className="text-center mb-8 w-full max-w-2xl">
                {isRecording ? (
                  <>
                    <p className="text-2xl font-bold text-red-600 mb-2">{t("voice.recording")}</p>
                    <p className="text-slate-600">{t("voice.clickToStop")}</p>
                  </>
                ) : hasRecording ? (
                  <>
                    <p className="text-2xl font-bold text-emerald-600 mb-2">{t("voice.recordingComplete")}</p>
                    <p className="text-slate-600">{t("voice.clickAnalyze")}</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-slate-800 mb-2">{t("voice.readyToRecord")}</p>
                    <p className="text-slate-600">{t("voice.clickAndDescribe")}</p>
                  </>
                )}
              </div>

              {transcript && (
                <div className="mb-8 w-full max-w-2xl rounded-xl border border-blue-100 bg-blue-50 p-4 text-slate-700">
                  <p className="text-sm font-semibold mb-2">Transcription</p>
                  <p className="text-sm">{transcript}</p>
                </div>
              )}

              {isRecording && (
                <div className="flex gap-2 mb-8">
                  {[...Array(5)].map((_, index) => (
                    <div
                      key={index}
                      className="h-10 w-2 rounded-full bg-gradient-to-t from-blue-600 to-emerald-600 animate-pulse"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-4 w-full max-w-2xl sm:flex-row sm:justify-center">
                <Button
                  onClick={toggleRecording}
                  disabled={!isVoiceSupported || analyzing}
                  className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-lg hover:from-blue-700 hover:to-emerald-700 sm:w-auto"
                >
                  {isRecording ? t("voice.stop") : t("voice.start")}
                </Button>
                {hasRecording && !isRecording && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setHasRecording(false);
                      setAudioBlob(null);
                      setTranscript("");
                      setAnalysisResult(null);
                      setAnalysisError(null);
                    }}
                    className="w-full border-slate-300 text-slate-700 hover:bg-slate-50 sm:w-auto"
                  >
                    {t("voice.reset")}
                  </Button>
                )}
              </div>

              {analysisError && (
                <div className="mt-6 w-full max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                  {analysisError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {analysisResult && (
          <Card className="border-2 border-blue-100 shadow-xl bg-gradient-to-br from-white to-sky-50">
            <CardContent className="p-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 p-4 text-white">
                    <FileText className="size-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-slate-800">{t("voice.analysisResults")}</h2>
                    <p className="text-slate-600">{t("voice.aiGeneratedInsights")}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-4">{t("voice.detectedSymptoms")}</h3>
                  <div className="flex flex-wrap gap-3">
                    {analysisResult.symptoms.map((symptom, index) => (
                      <span key={index} className="rounded-full bg-blue-100 px-4 py-2 text-blue-700">{symptom}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-4">{t("voice.possibleConditions")}</h3>
                  <div className="space-y-3">
                    {analysisResult.possibleConditions.map((condition, index) => (
                      <div key={index} className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                        <div className="h-2 w-2 rounded-full bg-emerald-600" />
                        <span className="text-slate-700">{condition}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-4">{t("voice.aiRecommendations")}</h3>
                  <div className="space-y-3">
                    {analysisResult.recommendations.map((rec, index) => (
                      <div key={index} className="flex gap-3 rounded-lg border-2 border-blue-100 bg-white p-4">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-bold">{index + 1}</div>
                        <span className="text-slate-700">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-6">
                  <p className="text-sm text-amber-800"><strong>Important:</strong> {t("voice.disclaimer")}</p>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white sm:w-auto"
                    onClick={() => {
                      setAnalysisResult(null);
                      setHasRecording(false);
                      setAudioBlob(null);
                      setTranscript("");
                      setAnalysisError(null);
                    }}
                  >
                    {t("voice.newAnalysis")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { step: 1, title: "Record", desc: "Click the microphone and describe your symptoms naturally" },
            { step: 2, title: "Process", desc: "Our AI analyzes your voice and extracts key health information" },
            { step: 3, title: "Insights", desc: "Receive personalized health insights and recommendations" },
          ].map((item, index) => (
            <Card key={index} className="border border-emerald-100 hover:border-emerald-300 transition-all shadow-md">
              <CardContent className="p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white font-bold text-xl">
                  {item.step}
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-800">{item.title}</h3>
                <p className="text-slate-600 text-sm">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
