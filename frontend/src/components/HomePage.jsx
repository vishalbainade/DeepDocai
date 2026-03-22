import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UploadZone from './UploadZone';
//import DeepDocAILogo from './DeepDocAILogo';
import { uploadDocument, getUser } from '../services/api';
import { useChat } from '../contexts/ChatContext';
import { useDarkColors } from '../utils/darkMode';

const HomePage = () => {
  const navigate = useNavigate();
  const { createNewChat, setCurrentDocumentId } = useChat();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  const [user, setUser] = useState(null);
  const dc = useDarkColors();

  useEffect(() => {
    const userData = getUser();
    setUser(userData);

    // Check if this is a new user (first login)
    const isNewUserFlag = localStorage.getItem('isNewUser');
    if (isNewUserFlag !== null) {
      setIsNewUser(JSON.parse(isNewUserFlag));
      // Clear the flag after displaying the message
      localStorage.removeItem('isNewUser');
    }
  }, []);

  const handleUpload = async (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStage('Starting upload...');

    try {
      const result = await uploadDocument(file, (progress, stage) => {
        setUploadProgress(progress);
        setUploadStage(stage || 'Processing...');
      });

      setCurrentDocumentId(result.documentId);

      // Create a new chat for this document
      const newChat = await createNewChat(result.documentId);
      if (newChat) {
        navigate(`/chat/${newChat.id}`);
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(0);
      setUploadStage('Error');
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        alert('Failed to upload document: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setIsUploading(false);
      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStage('');
      }, 1000);
    }
  };

  return (
    <div 
      className="h-full w-full flex items-center justify-center overflow-auto transition-colors duration-300"
      style={{ backgroundColor: dc.bgSecondary }}
    >
      <div className="w-full max-w-2xl px-6 py-12">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            {/* <DeepDocAILogo size="large" /> */}
          </div>
          {user && (
            <h2 className="text-2xl font-bold mb-2 transition-colors duration-300" style={{ color: dc.textPrimary }}>
              {isNewUser ? `Welcome, ${user.name}!` : `Welcome back, ${user.name}!`}
            </h2>
          )}
          <p className="text-lg transition-colors duration-300" style={{ color: dc.textSecondary }}>
            Upload a document to start asking questions
          </p>
        </div>
        <UploadZone
          onUpload={handleUpload}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          uploadStage={uploadStage}
        />
      </div>
    </div>
  );
};

export default HomePage;

