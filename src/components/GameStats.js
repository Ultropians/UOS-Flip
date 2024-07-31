import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useUltra } from '@ultra-alliance/react-ultra';

const GameStats = () => {
  const [contractBalance, setContractBalance] = useState('Loading...');
  const [totalBets, setTotalBets] = useState('Loading...');
  const [totalVolume, setTotalVolume] = useState('Loading...');
  const [totalPayout, setTotalPayout] = useState('Loading...');
  const [lastKnownRowCount, setLastKnownRowCount] = useState(0);
  const { ultra } = useUltra();

  useEffect(() => {
    const checkForUpdates = async () => {
        try {
          const resultsResponse = await ultra.api.getTableRows({
            json: true,
            code: '1aa2aa3aa4em',
            scope: '1aa2aa3aa4em',
            table: 'results',
            limit: -1
          });
      
          const currentRowCount = resultsResponse.rows.length > 0 ? resultsResponse.rows[resultsResponse.rows.length - 1].id : 0;
          console.log('currentRowCount', currentRowCount);

          if (currentRowCount !== lastKnownRowCount) {
            await fetchFullStats();
            setLastKnownRowCount(currentRowCount);
          }
        } catch (error) {
          console.error('Error checking for updates:', error);
        }
      };      
      

    const fetchFullStats = async () => {
      try {
        const balanceResponse = await ultra.api.getTableRows({
          code: 'eosio.token',
          scope: '1aa2aa3aa4em',
          table: 'accounts',
          limit: 1
        });
        setContractBalance(balanceResponse.rows[0]?.balance || '0 UOS');

        const resultsResponse = await ultra.api.getTableRows({
          json: true,
          code: '1aa2aa3aa4em',
          scope: '1aa2aa3aa4em',
          table: 'results',
          limit: -1
        });

        const latestId = resultsResponse.rows.length > 0 ? resultsResponse.rows[resultsResponse.rows.length - 1].id : 0;
        setTotalBets(latestId.toString());

        const volume = resultsResponse.rows.reduce((sum, row) => sum + parseFloat(row.bet.split(' ')[0]), 0);
        setTotalVolume(volume.toFixed(2) + ' UOS');

        const payout = resultsResponse.rows.reduce((sum, row) => sum + parseFloat(row.payout.split(' ')[0]), 0);
        setTotalPayout(payout.toFixed(2) + ' UOS');
      } catch (error) {
        console.error('Error fetching full stats:', error);
      }
    };

    checkForUpdates();
    const interval = setInterval(checkForUpdates, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [ultra.api, lastKnownRowCount]);

  return (
    <Box sx={{ position: 'fixed', left: 20, top: '20%', transform: 'translateY(-50%)' }}>
      <Typography variant="h6">Game Statistics</Typography>
      <Typography>💰 Available Pot: {contractBalance}</Typography>
      <Typography>🏦 House Edge: 2% on payout</Typography>
      <Typography>🎲 Total Bets Placed: {totalBets}</Typography>
      <Typography>💸 Total Volume Wagered: {totalVolume}</Typography>
      <Typography>💰 Total UOS Payed Out: {totalPayout}</Typography>
    </Box>
  );
};

export default GameStats;
