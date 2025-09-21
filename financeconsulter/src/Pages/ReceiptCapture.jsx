import { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Stack, Typography, Tabs, Tab, CircularProgress, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { uploadReceipt } from '../services/api';

// Basic capture + upload page for receipts
export default function ReceiptCapture({ onSubmit }) {
  const [mode, setMode] = useState('camera'); // 'camera' | 'upload'
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [preview, setPreview] = useState(null); // data URL
  const [file, setFile] = useState(null); // File object
  const [error, setError] = useState(null);
  const [camLoading, setCamLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    if (mode !== 'camera') return;
    let stream;
    async function startCamera() {
      try {
        setCamLoading(true);
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia not supported');
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
  setError('Camera access denied or not available.');
        // Fallback to Upload-Tab on smartphones
        setMode('upload');
      }
      finally {
        setCamLoading(false);
      }
    }
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [mode]);

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
      const res = await uploadReceipt(payload);
      if (onSubmit) onSubmit({ file, preview, response: res });
    } catch (e) {
      setError('Upload failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Paper elevation={0} sx={{ mb: 2, bgcolor: 'transparent' }}>
        <Tabs value={mode} onChange={(_, v) => setMode(v)}>
          <Tab value="camera" icon={<PhotoCameraIcon />} iconPosition="start" label="Take photo" />
          <Tab value="upload" icon={<UploadFileIcon />} iconPosition="start" label="Upload PDF/Image" />
        </Tabs>
      </Paper>

      {mode === 'camera' ? (
        <Stack spacing={2}>
          <Paper sx={{ p: 1 }}>
            {camLoading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 240 }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 1 }}>Starting camera…</Typography>
              </Stack>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', borderRadius: 4, maxHeight: '60vh', objectFit: 'cover' }}
              />
            )}
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

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>
      )}

      {!!error && (
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 3 }}>
        <Button fullWidth={isMobile} size="large" variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Uploading…' : 'Continue / Upload'}
        </Button>
      </Stack>
    </Box>
  );
}
