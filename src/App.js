import './App.css'
import React from 'react';
import { useUltra } from '@ultra-alliance/react-ultra';
import { Button, Typography, Box } from '@mui/material';
import CoinFlipGame from './components/CoinFlipGame'
import GameStats from './components/GameStats';


const AnnouncementBar = () => (
  <div className="announcement-bar">
    📌 Please note this dApp is meant to be for educational purposes only. Use at your own risk. Currently only available on Testnet
  </div>
);

const App = () => {
  const {account, isAuthenticated, login, logout, hasAuthError } = useUltra();

  return (
    
    <Box className="centeredContent" sx={{ flexDirection: 'column', paddingTop: '50px' }}>
      <AnnouncementBar />
      <GameStats />
      <CoinFlipGame account={account} isAuthenticated={isAuthenticated} />
      <Box className="connectButton">
        {isAuthenticated && (
            <div className="balance-display">
              {'Balance: ' + account.data.core_liquid_balance 
                ? parseFloat(account.data.core_liquid_balance).toFixed(2) + ' UOS'
                : 'Loading...'}
            </div>
          )}
        <Button 
          color="primary" 
          variant="contained" 
          onClick={isAuthenticated ? logout : login}
        >
          {isAuthenticated ? 'Disconnect' : 'Connect wallet'}
        </Button>
        
        {hasAuthError && (
          <div className="authErrorMessage">
            <Typography variant="body1" color="error">
              Login failed, please connect your wallet.
            </Typography>
          </div>
        )}
      </Box>
    </Box>
  );
};

export default App;
