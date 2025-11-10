import { useState, useEffect } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Card,
    CardContent,
    Typography,
    Chip,
    Grid,
    Divider,
    Alert
} from '@mui/material';
import axios from 'axios';

export const HubSpotIntegration = ({ user, org, integrationParams, setIntegrationParams }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    
    const handleConnectClick = async () => {
        try {
            setIsConnecting(true);
            setError(null);
            const formData = new FormData();
            formData.append('user_id', user);
            formData.append('org_id', org);

            const response = await axios.post(
                'http://localhost:8000/integrations/hubspot/authorize',
                formData
            );

            const authUrl = response.data.authorization_url;

            const width = 600;
            const height = 700;
            const left = window.screenX + (window.outerWidth - width) / 2;
            const top = window.screenY + (window.outerHeight - height) / 2;

            const popup = window.open(
                authUrl,
                'HubSpot OAuth',
                `width=${width},height=${height},left=${left},top=${top}`
            );

            const pollTimer = setInterval(async () => {
                if (popup.closed) {
                    clearInterval(pollTimer);
                    setIsConnecting(false);
                    await checkConnection();
                }
            }, 1000);

        } catch (err) {
            console.error(err);
            setError('Failed to connect to HubSpot.');
            setIsConnecting(false);
        }
    };

    
    const fetchItems = async (credentials) => {
        try {
            setLoading(true);
            const res = await axios.post('http://localhost:8000/integrations/hubspot/items', { credentials });
            setItems(res.data);
        } catch (err) {
            console.error(err);
            setError('Failed to fetch HubSpot items.');
        } finally {
            setLoading(false);
        }
    };

    
    const checkConnection = async () => {
        try {
            const res = await axios.get(
                `http://localhost:8000/integrations/hubspot/credentials?user_id=${user}&org_id=${org}`
            );
            if (res.data?.access_token) {
                setIsConnected(true);
                await fetchItems(res.data);
            }
        } catch {
            setIsConnected(false);
        }
    };

    useEffect(() => {
        checkConnection();
    }, [user, org]);

    const handleDisconnect = async () => {
        try {
            await axios.delete(
                `http://localhost:8000/integrations/hubspot/credentials?user_id=${user}&org_id=${org}`
            );
            setIsConnected(false);
            setItems([]);
            setIntegrationParams({});
        } catch {
            setError('Failed to disconnect.');
        }
    };

    const getTypeIcon = (type) => ({
        contact: '👤',
        company: '🏢',
        deal: '💼'
    }[type] || '📄');

    const getTypeColor = (type) => ({
        contact: 'primary',
        company: 'secondary',
        deal: 'success'
    }[type] || 'default');

    const groupedItems = items.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item);
        return acc;
    }, {});

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, bgcolor: '#f5f6fa', p: 3, borderRadius: 2 }}>
            {/* Connection */}
            <Box>
                {!isConnected ? (
                    <Button
                        variant="contained"
                        onClick={handleConnectClick}
                        disabled={isConnecting}
                        startIcon={isConnecting ? <CircularProgress size={20} /> : null}
                        fullWidth
                        sx={{ py: 1.5 }}
                    >
                        {isConnecting ? 'Connecting...' : '🔶 Connect HubSpot'}
                    </Button>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Alert severity="success">
                            <strong>Connected to HubSpot</strong> - {items.length} items loaded
                        </Alert>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={handleDisconnect}
                            size="small"
                        >
                            Disconnect
                        </Button>
                    </Box>
                )}
            </Box>

            {/* Error */}
            {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

            {/* Loading */}
            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}

            {/* Items */}
            {isConnected && !loading && items.length > 0 && (
                <Box>
                    <Typography variant="h6" gutterBottom>HubSpot CRM Data</Typography>

                    {/* Summary */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                        {Object.entries(groupedItems).map(([type, arr]) => (
                            <Chip key={type} label={`${getTypeIcon(type)} ${type}s: ${arr.length}`} color={getTypeColor(type)} variant="outlined" />
                        ))}
                    </Box>

                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={2}>
                        {items.map(item => (
                            <Grid item xs={12} sm={6} md={4} key={`${item.type}-${item.id}`}>
                                <Card variant="outlined" sx={{ height: '100%', transition: '0.2s', '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' } }}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                                            <Typography variant="h5">{getTypeIcon(item.type)}</Typography>
                                            <Chip label={item.type} size="small" color={getTypeColor(item.type)} />
                                        </Box>

                                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.name}
                                        </Typography>

                                        <Box sx={{ mt: 2 }}>
                                            {item.data.email && <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>✉️ {item.data.email}</Typography>}
                                            {item.data.company && <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>🏢 {item.data.company}</Typography>}
                                            {item.data.domain && <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>🌐 {item.data.domain}</Typography>}
                                            {item.data.industry && <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>🏭 {item.data.industry}</Typography>}
                                            {item.data.amount && <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>💰 ${item.data.amount}</Typography>}
                                            {item.data.stage && <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>📊 {item.data.stage}</Typography>}
                                        </Box>

                                        <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block' }}>ID: {item.id}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {isConnected && !loading && items.length === 0 && (
                <Alert severity="info">No items found in HubSpot. Try adding contacts, companies, or deals!</Alert>
            )}
        </Box>
    );
};
