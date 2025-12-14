import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Stack, Typography, Tabs, Tab, CircularProgress, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ReceiptReviewDialog from '../Components/ReceiptReviewDialog';

// Basic capture + upload page for receipts
export default function ReceiptCapture({ onSubmit }) {
  const [mode, setMode] = useState('camera'); // 'camera' | 'upload'
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [preview, setPreview] = useState(null); // data URL
  const [file, setFile] = useState(null); // File object
  const [error, setError] = useState(null);
  const [camLoading, setCamLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Review Dialog State
  const [reviewOpen, setReviewOpen] = useState(false);
  const [scannedData, setScannedData] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getAuthHeaders = (includeJsonContentType = true) => {
    const token = localStorage.getItem('authToken');
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(includeJsonContentType ? { 'Content-Type': 'application/json' } : {})
    };
  };

  const scanReceipt = async (fileOrDataUrl) => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('No authentication token found');

    const formData = new FormData();
    if (typeof fileOrDataUrl === 'string') {
      const res = await fetch(fileOrDataUrl);
      const blob = await res.blob();
      formData.append('file', blob, 'capture.jpg');
    } else {
      formData.append('file', fileOrDataUrl);
    }

    const response = await fetch('http://127.0.0.1:8000/receipt/scan', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || 'Failed to scan receipt');
    }

    return response.json();
  };

  const createReceipt = async (receiptData) => {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('No authentication token found');

    const response = await fetch('http://127.0.0.1:8000/receipt/', {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(receiptData)
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || 'Failed to create receipt');
    }

    return response.json();
  };

  const stopStream = useCallback(() => {
    const currentStream = streamRef.current;
    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (mode !== 'camera') {
      stopStream();
      setCamLoading(false);
      return;
    }

    let cancelled = false;
    let localStream;
    let detachVideoListeners = () => {};

    const attachStreamToVideo = (stream) => {
      const videoEl = videoRef.current;
      if (!videoEl) {
        setCamLoading(false);
        return;
      }

      const handleVideoReady = () => {
        videoEl.removeEventListener('loadedmetadata', handleVideoReady);
        videoEl.removeEventListener('loadeddata', handleVideoReady);
        videoEl.removeEventListener('canplay', handleVideoReady);
        const playPromise = videoEl.play?.();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {});
        }
        setCamLoading(false);
        setError(null);
      };

      videoEl.addEventListener('loadedmetadata', handleVideoReady);
      videoEl.addEventListener('loadeddata', handleVideoReady);
      videoEl.addEventListener('canplay', handleVideoReady);
      detachVideoListeners = () => {
        videoEl.removeEventListener('loadedmetadata', handleVideoReady);
        videoEl.removeEventListener('loadeddata', handleVideoReady);
        videoEl.removeEventListener('canplay', handleVideoReady);
      };

      videoEl.srcObject = stream;
      if (videoEl.readyState >= 2 && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        handleVideoReady();
      }
    };

    async function startCamera() {
      try {
        setCamLoading(true);
        setError(null);

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia not supported');
        }
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (cancelled) {
          localStream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = localStream;
        attachStreamToVideo(localStream);
      } catch (e) {
        stopStream();
        setError('Camera access denied or not available.');
        setMode('upload');
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      detachVideoListeners();
      stopStream();
    };
  }, [mode, stopStream]);

  useEffect(() => {
    return () => {
      // Ensure camera stream is stopped when component unmounts
      const currentStream = streamRef.current;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []); 

  const handleModeChange = (_, value) => {
    if (value) {
      // Stop camera stream when switching away from camera mode
      if (mode === 'camera' && value !== 'camera') {
        stopStream();
        setCamLoading(false);
      }
      setMode(value);
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    
    // Downscale for mobile devices
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(vw, vh));
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPreview(dataUrl);
    setFile(null);
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Preview for images only
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
    setFile(f);
  };

  const reset = () => {
    setPreview(null);
    setFile(null);
  };

  const handleSubmit = async () => {
    const payload = file || preview;
    if (!payload) return;
    try {
      setSubmitting(true);
      setError(null);
      // 1. Scan the receipt
      const res = await scanReceipt(payload);
      
      if (res.error) {
          throw new Error(res.error);
      }

      // 2. Open review dialog with scanned data
      setScannedData(res);
      setReviewOpen(true);
      
    } catch (e) {
      console.error(e);
      setError('Scanning failed: ' + (e.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveReceipt = async (finalData) => {
      try {
          setSubmitting(true);
          // 3. Create receipt with confirmed data
          let res = await createReceipt(finalData);

          // 4. Fetch line items via ReceiptLineItemRepository route (sanity + consistent API)
          if (res?.id) {
            try {
              const liRes = await fetch(`http://127.0.0.1:8000/receipt_line_item/${res.id}`, {
                headers: getAuthHeaders(true)
              });
              if (liRes.ok) {
                const lineItems = await liRes.json();
                res = { ...res, line_items: Array.isArray(lineItems) ? lineItems : [] };
              }
            } catch (e) {
              // Non-blocking
              console.error('Failed to fetch receipt line items:', e);
            }
          }
          
          setReviewOpen(false);
          if (onSubmit) onSubmit({ response: res });
          
          // Reset
          reset();
          setMode('camera'); // Go back to camera?
      } catch (e) {
          console.error(e);
          setError('Saving failed: ' + (e.message || 'Unknown error'));
      } finally {
          setSubmitting(false);
      }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        📸 Receipt Scanner
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Capture or upload your receipts
      </Typography>

      <Paper elevation={0} sx={{ mb: 2, bgcolor: 'transparent' }}>
        <Tabs value={mode} onChange={handleModeChange}>
          <Tab value="camera" icon={<PhotoCameraIcon />} iconPosition="start" label="Take photo" />
          <Tab value="upload" icon={<UploadFileIcon />} iconPosition="start" label="Upload PDF/Image" />
        </Tabs>
      </Paper>

      {mode === 'camera' ? (
        <Stack spacing={2}>
          <Paper sx={{ p: 1 }}>
            <Box sx={{ position: 'relative', minHeight: 240 }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', borderRadius: 4, maxHeight: '60vh', objectFit: 'cover', opacity: camLoading ? 0 : 1, transition: 'opacity 0.2s ease' }}
              />
              {camLoading && (
                <Stack alignItems="center" justifyContent="center" sx={{ position: 'absolute', inset: 0 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 1 }}>Starting camera…</Typography>
                </Stack>
              )}
            </Box>
          </Paper>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button fullWidth={isMobile} size="large" variant="contained" onClick={capturePhoto} startIcon={<PhotoCameraIcon />}>Capture photo</Button>
            <Button fullWidth={isMobile} size="large" variant="outlined" onClick={reset}>Reset</Button>
          </Stack>
          {preview && (
            <Paper sx={{ p: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Preview</Typography>
              <img alt="preview" src={preview} style={{ width: '100%', borderRadius: 4, maxHeight: '60vh', objectFit: 'contain' }} />
            </Paper>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </Stack>
      ) : (
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Button fullWidth={isMobile} size="large" variant="contained" component="label" startIcon={<UploadFileIcon />}>
                Choose file
                <input hidden type="file" accept="image/*,application/pdf" capture="environment" onChange={onPickFile} />
              </Button>
              {file && <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>{file.name}</Typography>}
              <Button fullWidth={isMobile} size="large" variant="outlined" onClick={reset}>Reset</Button>
            </Stack>
          </Paper>
          {file && file.type === 'application/pdf' && (
            <Paper sx={{ p: 1 }}>
              <Typography variant="subtitle2" gutterBottom>PDF selected</Typography>
              <Typography variant="body2" color="text.secondary">Preview for PDFs is limited. The file will be processed after upload.</Typography>
            </Paper>
          )}
          {preview && (
            <Paper sx={{ p: 1 }}>
              <Typography variant="subtitle2" gutterBottom>Preview</Typography>
              <img alt="preview" src={preview} style={{ width: '100%', borderRadius: 4, maxHeight: '60vh', objectFit: 'contain' }} />
            </Paper>
          )}
        </Stack>
      )}

      {!!error && (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 3 }}>
        <Button 
          fullWidth={isMobile} 
          size="large" 
          variant="contained" 
          onClick={handleSubmit} 
          disabled={submitting || (!file && !preview)}
        >
          {submitting ? 'Processing…' : 'Scan Receipt'}
        </Button>
      </Stack>

      <ReceiptReviewDialog 
        open={reviewOpen} 
        onClose={() => setReviewOpen(false)}
        initialData={scannedData}
        onSave={handleSaveReceipt}
        loading={submitting}
      />
    </Box>
  );
}
