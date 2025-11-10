import { useState, useEffect } from 'react';
import { Box, Autocomplete, TextField, Paper, Typography } from '@mui/material';
import AirtableIntegration from './integrations/airtable';
import NotionIntegration from './integrations/notion';
import { HubSpotIntegration } from './integrations/hubspot';
import { DataForm } from './data-form';

//bubble 
const BubbleBackground = () => (
  <canvas
    id="bubble-canvas"
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: -1,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #404040 100%)',
    }}
  />
);
//2nd
const integrationMapping = {
  'Notion': NotionIntegration,
  'Airtable': AirtableIntegration,
  'HubSpot': HubSpotIntegration,
};

export const IntegrationForm = () => {
  const [integrationParams, setIntegrationParams] = useState({});
  const [user, setUser] = useState('TestUser');
  const [org, setOrg] = useState('TestOrg');
  const [currType, setCurrType] = useState(null);

  const CurrIntegration = integrationMapping[currType];

  
  useEffect(() => {
    const canvas = document.getElementById('bubble-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const bubbles = [];
    const colors = [
      'rgba(255, 255, 255, 0.3)',
      'rgba(150, 150, 150, 0.4)',
      'rgba(100, 100, 100, 0.3)',
      'rgba(200, 200, 200, 0.4)',
    ];

    for (let i = 0; i < 60; i++) {
      bubbles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 8 + 3,
        speed: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.4 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        wobble: Math.random() * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    let frame = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      bubbles.forEach((b) => {
        ctx.beginPath();
        const wobbleX = Math.sin(frame * b.wobbleSpeed) * b.wobble;
        ctx.arc(b.x + wobbleX, b.y, b.r, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
        
        //glow e
        ctx.shadowBlur = 15;
        ctx.shadowColor = b.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        b.y -= b.speed;
        if (b.y < -b.r) {
          b.y = canvas.height + b.r;
          b.x = Math.random() * canvas.width;
        }
      });
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Box 
      sx={{ 
        position: 'relative', 
        minHeight: '100vh', 
        p: 4,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <BubbleBackground />
      
      <Box 
        sx={{ 
          width: '100%', 
          maxWidth: '1200px',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        {/* Header */}
        <Paper 
          elevation={8}
          sx={{ 
            p: 4, 
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
            textAlign: 'center',
          }}
        >
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 700,
              background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            🚀 Integration Hub
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Connect your favorite tools seamlessly
          </Typography>
        </Paper>

        {/* Configuration Panel */}
        <Paper 
          elevation={8}
          sx={{ 
            p: 4, 
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Configuration
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="User"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': { 
                    borderColor: '#666',
                  },
                  '&.Mui-focused fieldset': { 
                    borderColor: '#888',
                    borderWidth: 2,
                  },
                },
              }}
            />
            
            <TextField
              label="Organization"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              fullWidth
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': { 
                    borderColor: '#667eea',
                  },
                  '&.Mui-focused fieldset': { 
                    borderColor: '#667eea',
                    borderWidth: 2,
                  },
                },
              }}
            />
            
            <Autocomplete
              id="integration-type"
              options={Object.keys(integrationMapping)}
              value={currType}
              fullWidth
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Integration Type"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': { 
                        borderColor: '#666',
                      },
                      '&.Mui-focused fieldset': { 
                        borderColor: '#888',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              )}
              onChange={(e, value) => setCurrType(value)}
              sx={{
                '& .MuiAutocomplete-tag': {
                  background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
                  color: '#fff',
                },
              }}
            />
          </Box>
        </Paper>

        {/* Integration Component */}
        {currType && CurrIntegration && (
          <Paper 
            elevation={8}
            sx={{ 
              p: 4, 
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: 3,
              animation: 'fadeIn 0.5s ease-in',
              '@keyframes fadeIn': {
                from: { opacity: 0, transform: 'translateY(20px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 3, 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {currType === 'HubSpot' && '🔶'}
              {currType === 'Notion' && '📝'}
              {currType === 'Airtable' && '📊'}
              {currType} Integration
            </Typography>
            
            <CurrIntegration
              user={user}
              org={org}
              integrationParams={integrationParams}
              setIntegrationParams={setIntegrationParams}
            />
          </Paper>
        )}

        {/* Data Form */}
        {integrationParams?.credentials && (
          <Paper 
            elevation={8}
            sx={{ 
              p: 4, 
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: 3,
              animation: 'fadeIn 0.5s ease-in',
              '@keyframes fadeIn': {
                from: { opacity: 0, transform: 'translateY(20px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <DataForm
              integrationType={integrationParams?.type}
              credentials={integrationParams?.credentials}
            />
          </Paper>
        )}
      </Box>
    </Box>
  );
};
