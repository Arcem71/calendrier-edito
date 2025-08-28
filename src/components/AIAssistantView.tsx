import React, { useState, useEffect, useRef, FormEvent } from "react";
import {
  Send,
  Bot,
  User,
  Plus,
  Trash2 as Trash,
  MessageSquare,
  Loader2,
  Paperclip,
  X,
  Image as ImageIcon,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

// Types
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  images?: { url: string; filename: string }[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
}

interface ImagePreviewModalProps {
  images: { url: string; filename: string }[];
  initialIndex: number;
  onClose: () => void;
}

// Constants
const STORAGE_KEY = "ai-chat-sessions";
const ENDPOINT =
  import.meta.env.VITE_ASSISTANT_ENDPOINT ??
  "https://n8n.arcem-assurances.fr/webhook/assistant";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const TIMEOUT_DURATION = 500_000; // 3 minutes in milliseconds

// Utils
const uuid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID()) ||
  Math.random().toString(36).slice(2, 10);

// Function to extract Supabase URLs from text
const extractSupabaseUrls = (text: string): string[] => {
  const regex = /https:\/\/[a-zA-Z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/[^\s)"}]*/g;
  const matches = text.match(regex) || [];
  // Remove duplicates
  return [...new Set(matches)];
};

// Function to generate a meaningful title from message content
const generateTitle = (content: string): string => {
  // Remove URLs and special characters
  const cleanContent = content
    .replace(/https?:\/\/[^\s]+/g, '')
    .replace(/[^\w\s]/g, ' ')
    .trim();

  // Split into words and get first few meaningful words
  const words = cleanContent.split(/\s+/).filter(word => word.length > 2);
  const titleWords = words.slice(0, 4);

  if (titleWords.length === 0) {
    return "Nouvelle discussion";
  }

  // Create title with first few words
  let title = titleWords.join(' ');
  if (title.length > 40) {
    title = title.substring(0, 37) + '...';
  } else if (words.length > 4) {
    title += '...';
  }

  return title.charAt(0).toUpperCase() + title.slice(1);
};

const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative max-w-4xl max-h-[90vh] p-4">
        <button
          onClick={onClose}
          className="absolute top-0 right-0 m-4 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100"
        >
          <X className="w-6 h-6" />
        </button>
        
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
        
        <img
          src={images[currentIndex].url}
          alt={images[currentIndex].filename}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
          onClick={(e) => e.stopPropagation()}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://placehold.co/600x400?text=Image+non+trouvée';
          }}
        />
        
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  );
};

export function AIAssistantView() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // Not used - keep for future features
  const [uploadedImages, setUploadedImages] = useState<{ url: string; filename: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImages, setPreviewImages] = useState<{ url: string; filename: string }[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    const loadSessions = async () => {
      if (initialized) return;
      setInitialized(true);

      try {
        const { data: chatHistory, error } = await supabase
          .from('history_chat')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;

        if (chatHistory?.length) {
          const groupedMessages = chatHistory.reduce((acc: { [key: string]: ChatMessage[] }, curr) => {
            const message = curr.message as ChatMessage;
            if (!acc[curr.session_id]) {
              acc[curr.session_id] = [];
            }
            acc[curr.session_id].push(message);
            return acc;
          }, {});

          const loadedSessions = Object.entries(groupedMessages).map(([sessionId, messages]) => {
            // Find first user message to use as title
            const firstUserMessage = messages.find(m => m.role === 'user');
            const title = firstUserMessage ? generateTitle(firstUserMessage.content) : "Nouvelle discussion";
            
            return {
              id: sessionId,
              title,
              messages
            };
          });

          setSessions(loadedSessions);
          if (loadedSessions.length > 0) {
            setCurrentId(loadedSessions[0].id);
          }
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    };

    loadSessions();
  }, [initialized]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sessions, currentId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + N for new session
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        addSession();
      }
      // Escape to toggle sidebar
      if (e.key === 'Escape' && document.activeElement?.tagName !== 'TEXTAREA') {
        setIsSidebarOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentSession = sessions.find((s) => s.id === currentId);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setFileError(null);

    const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles.map(file => file.name).join(', ');
      setFileError(`Les fichiers suivants dépassent la limite de 5 MB : ${fileNames}`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    await uploadImages(files);
  };

  const uploadImages = async (files: File[]) => {
    setUploading(true);
    const uploadedImages: { url: string; filename: string }[] = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('editorial-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('editorial-images')
          .getPublicUrl(filePath);

        uploadedImages.push({
          url: publicUrl,
          filename: fileName
        });
      }

      setUploadedImages(prev => [...prev, ...uploadedImages]);
    } catch (error) {
      console.error('Error uploading images:', error);
      setFileError('Une erreur est survenue lors du téléchargement des images.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeUploadedImage = async (filename: string) => {
    try {
      const { error } = await supabase.storage
        .from('editorial-images')
        .remove([filename]);

      if (error) throw error;

      setUploadedImages(prev => prev.filter(img => img.filename !== filename));
    } catch (error) {
      console.error('Error removing image:', error);
      setFileError('Une erreur est survenue lors de la suppression de l\'image.');
    }
  };

  const saveMessage = async (message: ChatMessage) => {
    if (!currentId) return;

    try {
      const { error } = await supabase
        .from('history_chat')
        .insert({
          session_id: currentId,
          message: message
        });

      if (error) throw error;

      setSessions(prev =>
        prev.map(s =>
          s.id === currentId
            ? { ...s, messages: [...s.messages, message] }
            : s
        )
      );
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  };

  const renameSession = (title: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === currentId ? { ...s, title } : s)),
    );
  };

  const sendMessage = async (text: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain;q=0.8",
        },
        body: JSON.stringify({
          sessionId: currentId,
          message: text,
          url_images: uploadedImages.map(img => img.url)
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(await res.text());

      const type = res.headers.get("content-type") ?? "";
      let reply: string;

      if (type.includes("application/json")) {
        try {
          const data = await res.json();
          reply = typeof data?.message === "string" ? data.message : JSON.stringify(data);
        } catch {
          reply = await res.text();
        }
      } else {
        reply = await res.text();
      }

      const imageUrls = extractSupabaseUrls(reply);
      
      const assistantMessage = {
        role: "assistant" as const,
        content: reply,
        timestamp: Date.now(),
        images: imageUrls.map(url => ({
          url,
          filename: url.split('/').pop() || ''
        }))
      };

      await saveMessage(assistantMessage);
      
      // Show notification when response is received
      toast.success('Nouvelle réponse de l\'assistant', {
        duration: 4000,
        icon: '🤖'
      });
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "AbortError"
          ? "Temps de réponse dépassé"
          : err instanceof Error
          ? err.message
          : "Erreur inconnue.";

      const errorMessage = {
        role: "assistant" as const,
        content: msg,
        timestamp: Date.now()
      };

      await saveMessage(errorMessage);
      
      // Show error notification
      toast.error('Erreur: ' + msg, {
        duration: 4000
      });
    } finally {
      setLoading(false);
      setUploadedImages([]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !currentSession) return;

    const text = input.trim();
    setInput("");
    setLoading(true);

    const userMessage = {
      role: "user" as const,
      content: text,
      timestamp: Date.now(),
      images: uploadedImages
    };

    try {
      await saveMessage(userMessage);

      if (currentSession.title === "Nouvelle discussion") {
        renameSession(generateTitle(text));
      }

      await sendMessage(text);
    } catch (error) {
      console.error('Error in message flow:', error);
      setLoading(false);
    }
  };

  const addSession = async () => {
    const id = uuid();
    const initialMessage = {
      role: "assistant" as const,
      content: "Bonjour ! Je suis ton assistant IA. Comment puis‑je t'aider ?",
      timestamp: Date.now()
    };

    try {
      const { error } = await supabase
        .from('history_chat')
        .insert({
          session_id: id,
          message: initialMessage
        });

      if (error) throw error;

      setSessions((prev) => [
        {
          id,
          title: "Nouvelle discussion",
          messages: [initialMessage],
        },
        ...prev,
      ]);
      setCurrentId(id);
    } catch (error) {
      console.error('Error creating new session:', error);
    }
  };

  const deleteSession = async (id: string) => {
    try {
      const { error } = await supabase
        .from('history_chat')
        .delete()
        .eq('session_id', id);

      if (error) throw error;

      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (id === currentId) {
        const remaining = sessions.filter((s) => s.id !== id);
        setCurrentId(remaining.length ? remaining[0].id : "");
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleImageClick = (images: { url: string; filename: string }[], index: number) => {
    setPreviewImages(images);
    setPreviewIndex(index);
  };

  if (!initialized) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Assistant IA</h2>
            <p className="text-sm text-gray-500">
              {loading ? "🟡 En cours..." : "🟢 Disponible"} • {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${
              isSidebarOpen
                ? 'bg-gray-100 text-gray-700'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            title={isSidebarOpen ? 'Masquer le panneau' : 'Afficher le panneau'}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm font-medium">
              {isSidebarOpen ? 'Masquer' : 'Discussions'}
            </span>
          </button>
          
          <button
            onClick={addSession}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Nouveau chat</span>
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-16rem)] gap-6">
        {/* Sidebar */}
        {isSidebarOpen && (
          <aside className="w-80 bg-gray-50 rounded-lg border border-gray-200 flex flex-col overflow-hidden">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Discussions</h3>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  {sessions.length}
                </span>
              </div>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {sessions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">Aucune discussion</p>
                  <p className="text-xs text-gray-400 mt-1">Créez votre première discussion</p>
                </div>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      s.id === currentId
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                        : 'bg-white hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setCurrentId(s.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        s.id === currentId
                          ? 'bg-white bg-opacity-20'
                          : 'bg-gray-100'
                      }`}>
                        <MessageSquare className={`w-4 h-4 ${
                          s.id === currentId ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${
                          s.id === currentId ? 'text-white' : 'text-gray-800'
                        }`} title={s.title}>
                          {s.title}
                        </p>
                        <p className={`text-xs mt-1 ${
                          s.id === currentId ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {s.messages.length} message{s.messages.length !== 1 ? 's' : ''} • {
                            s.messages.length > 0 
                              ? new Date(s.messages[s.messages.length - 1].timestamp).toLocaleDateString('fr-FR')
                              : 'Aujourd\'hui'
                          }
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(s.id);
                      }}
                      className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-full transition-all duration-200 ${
                        s.id === currentId
                          ? 'hover:bg-white hover:bg-opacity-20 text-white'
                          : 'hover:bg-red-100 text-red-500'
                      }`}
                      title="Supprimer cette discussion"
                    >
                      <Trash className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
              <div className="text-xs text-gray-500 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Assistant connecté</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Messages: {sessions.reduce((acc, s) => acc + s.messages.length, 0)}</span>
                  <span>Sessions: {sessions.length}</span>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Main Chat Area */}
        <div className={`flex-1 flex flex-col ${isSidebarOpen ? '' : 'max-w-none'}`}>
          {currentSession ? (
            <div className="flex-1 flex flex-col bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-gray-200 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 truncate max-w-md" title={currentSession.title}>
                        {currentSession.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {currentSession.messages.length} messages • Dernière activité : {
                          currentSession.messages.length > 0
                            ? new Date(currentSession.messages[currentSession.messages.length - 1].timestamp).toLocaleString('fr-FR')
                            : 'Maintenant'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      En ligne
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
                {currentSession.messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 ${
                      m.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-lg ${
                        m.role === "user"
                          ? "bg-gradient-to-br from-blue-500 to-blue-600"
                          : "bg-gradient-to-br from-purple-500 to-purple-600"
                      }`}
                    >
                      {m.role === "user" ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <Bot className="w-5 h-5 text-white" />
                      )}
                    </div>

                    <div
                      className={`group relative max-w-[75%] ${
                        m.role === "user" ? "text-right" : "text-left"
                      }`}
                    >
                      <div
                        className={`inline-block p-4 rounded-2xl shadow-sm ${
                          m.role === "user"
                            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                            : "bg-gray-100 text-gray-800 border border-gray-200"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {m.content}
                        </p>
                        
                        {/* Display uploaded images */}
                        {m.images && m.images.length > 0 && (
                          <div className="mt-3 grid grid-cols-2 gap-2 max-w-sm">
                            {m.images.map((img, idx) => (
                              <div 
                                key={idx} 
                                className="relative group/image cursor-pointer overflow-hidden rounded-lg"
                                onClick={() => handleImageClick(m.images || [], idx)}
                              >
                                <img
                                  src={img.url}
                                  alt={`Image ${idx + 1}`}
                                  className="w-full h-24 object-cover transition-transform hover:scale-105"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'https://placehold.co/600x400?text=Image+non+trouvée';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover/image:bg-opacity-30 transition-opacity flex items-center justify-center">
                                  <ImageIcon className="w-5 h-5 text-white opacity-0 group-hover/image:opacity-100" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div className={`mt-1 text-xs text-gray-400 ${
                        m.role === "user" ? "text-right" : "text-left"
                      }`}>
                        {new Date(m.timestamp).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-gray-100 border border-gray-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                        <span className="text-sm text-gray-600">
                          Assistant en train d'écrire...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input Section */}
              <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
                {fileError && (
                  <div className="mb-3 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm">{fileError}</p>
                    <button
                      onClick={() => setFileError(null)}
                      className="ml-auto p-1 hover:bg-red-100 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                
                {uploadedImages.length > 0 && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-800">
                        {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} prête{uploadedImages.length > 1 ? 's' : ''} à envoyer
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {uploadedImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={img.url}
                            alt={`Upload ${idx + 1}`}
                            className="w-12 h-12 object-cover rounded-lg border border-blue-200"
                          />
                          <button
                            onClick={() => removeUploadedImage(img.filename)}
                            className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Supprimer cette image"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit}>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                          }
                        }}
                        placeholder="Tapez votre message ici..."
                        className="w-full px-4 py-3 pr-14 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all duration-200 disabled:bg-gray-50 disabled:text-gray-500 resize-none min-h-[48px] max-h-[120px] text-sm"
                        rows={1}
                        style={{
                          height: 'auto',
                          minHeight: '48px'
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                        }}
                        disabled={loading}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setFileError(null);
                            fileInputRef.current?.click();
                          }}
                          className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all duration-200"
                          disabled={loading || uploading}
                          title="Joindre des images"
                        >
                          {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Paperclip className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*"
                        multiple
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !input.trim()}
                      className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg shadow-blue-500/25"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline font-medium">
                        {loading ? 'Envoi...' : 'Envoyer'}
                      </span>
                    </button>
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">⏎</kbd> Envoyer
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Shift + ⏎</kbd> Nouvelle ligne
                      </span>
                    </div>
                    <div className="text-gray-400">
                      {input.length}/2000 caractères
                    </div>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Bot className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Bienvenue dans l'Assistant IA
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  Votre assistant personnel pour vous aider avec la création de contenu, 
                  l'analyse d'images et bien plus encore.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={addSession}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
                  >
                    <Plus className="w-5 h-5" />
                    Démarrer une conversation
                  </button>
                  <div className="text-sm text-gray-500 space-y-1">
                    <div>Ou utilisez <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl + N</kbd> pour créer rapidement</div>
                    <div><kbd className="px-2 py-1 bg-gray-100 rounded">Échap</kbd> pour masquer/afficher le panneau</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImages && (
        <ImagePreviewModal
          images={previewImages}
          initialIndex={previewIndex}
          onClose={() => setPreviewImages(null)}
        />
      )}
    </div>
  );
}