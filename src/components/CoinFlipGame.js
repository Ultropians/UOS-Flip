import React, { useState, useEffect } from 'react';
import { Button, Typography, TextField, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useUltra } from '@ultra-alliance/react-ultra';
import coinFlipGif from '../assets/coinflip_animation.gif';
import coinFlipImage1 from '../assets/ultra_logo_round.png';
import { Checkbox } from '@mui/material';



const CoinFlipGame = () => {
  const [bet, setBet] = useState('');
  const [result, setResult] = useState(null);
  const [initialBalance, setInitialBalance] = useState(null);
  const [betPlaced, setBetPlaced] = useState(false);
  const [gameResults, setGameResults] = useState([]);
  const { ultra, account, isAuthenticated, refreshAccount } = useUltra();
  const [betChoice, setBetChoice] = useState(null);
  const [filterMyBets, setFilterMyBets] = useState(false);


  useEffect(() => {
    fetchGameResults();
    const interval = setInterval(fetchGameResults, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (betPlaced && account && account.data && account.data.core_liquid_balance && betChoice) {
      const newBalance = parseFloat(account.data.core_liquid_balance);
      const difference = newBalance - initialBalance;
      const outcome = difference > 0 ? 'won' : 'lost';
      const coinSide = outcome === 'won' ? betChoice : (betChoice === 'heads' ? 'tails' : 'heads');

      setTimeout(() => {
        if (difference > 0) {
          setResult(`🎉 Congratulations! The coin landed on ${coinSide}. You won ${difference.toFixed(8)} UOS!`);
        } else if (difference < 0) {
          setResult(`Sorry, the coin landed on ${coinSide}. You lost ${Math.abs(difference).toFixed(8)} UOS. Better luck next time!`);
        } else {
          setResult(`Whoops something went wrong! Your balance remains unchanged.`);
        }

        setBetPlaced(false);
        fetchGameResults();
      }, 2000);
    }
  }, [account, betPlaced, initialBalance, betChoice]);

  const fetchGameResults = async () => {
    try {
      const response = await ultra.api.getTableRows({
        json: true,
        code: '1aa2aa3aa4em',
        scope: '1aa2aa3aa4em',
        table: 'results',
        limit: 10,
        reverse: true,
      });
      const sortedResults = response.rows.sort((a, b) => b.id - a.id);
      setGameResults(sortedResults.slice(0, 10));
    } catch (error) {
      console.error('Error fetching game results:', error);
    }
  };

  const [playGif, setPlayGif] = useState(false);
  const [gifKey, setGifKey] = useState(0);

  const placeBet = async (choice) => {
    if (!isAuthenticated || !bet || isNaN(parseFloat(bet)) || parseFloat(bet) <= 0) {
      setResult('Please connect your wallet and enter a valid bet amount.');
      return;
    }

    setInitialBalance(parseFloat(account.data.core_liquid_balance));
    const betAmount = parseFloat(bet);
    setBetChoice(choice);

    try {
      await ultra.account.transferUos({
        from: account.data.account_name,
        to: '1aa2aa3aa4em',
        quantity: betAmount.toFixed(8) + ' UOS',
        memo: choice,
      });

      setResult(`Bet placed on ${choice}. Waiting for result...`);
      
      setPlayGif(true);
      setGifKey(prevKey => prevKey + 1);
      setTimeout(() => setPlayGif(false), 2000);
      
      await refreshAccount();
      
      setBetPlaced(true);
    } catch (error) {
      console.error('Transaction error:', error);
      setResult(`Error: ${error.message}`);
    }
  };

  return (
    <Box sx={{ textAlign: 'center', padding: 3, paddingTop: 8, width: '100%', paddingBottom: '50vh' }}>
      <Typography variant="h4" gutterBottom>
        UOS Flip
      </Typography>
      <TextField
        type="number"
        label="Bet Amount"
        value={bet}
        onChange={(e) => setBet(e.target.value)}
        disabled={!isAuthenticated}
        sx={{ marginBottom: 2 }}
      />
      <Box className="coin-flip-image-container">
        {playGif ? (
          <img 
            key={gifKey}
            src={coinFlipGif}
            alt="Coin Flip Animation"
            className="coin-flip-gif"
          />
        ) : (
          <img 
            src={coinFlipImage1}
            alt="Static Coin"
            className="coin-flip-image"
          />
        )}
      </Box>

      <Box>
        <Button
          variant="contained"
          onClick={() => placeBet('heads')}
          disabled={!isAuthenticated}
          sx={{ marginRight: 1 }}
        >
          Bet Heads
        </Button>
        <Button
          variant="contained"
          onClick={() => placeBet('tails')}
          disabled={!isAuthenticated}
          sx={{ marginLeft: 1 }}
        >
          Bet Tails
        </Button>
      </Box>
      {result && (
        <Typography variant="h5" sx={{ marginTop: 4 }}>
          {result}
        </Typography>
      )}
      {!isAuthenticated && (
        <Typography variant="body2" sx={{ marginTop: 2, color: 'text.secondary' }}>
          Please connect your wallet to place bets.
        </Typography>
      )}
      <TableContainer component={Paper} className="resultsTable">
        <Table>
          <TableHead>
            <TableRow>
            <TableCell>
                Player
                <Box sx={{ float: 'right', display: 'flex', alignItems: 'center' }}>
                My Bets Only
                <Checkbox
                  checked={filterMyBets}
                  onChange={(e) => setFilterMyBets(e.target.checked)}
                  size="small"
                />
                </Box>
              </TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Bet</TableCell>
              <TableCell>Result</TableCell>
              <TableCell>Payout</TableCell>
              <TableCell>Timestamp</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gameResults.filter(row => !filterMyBets || (account && account.data && account.data.account_name === row.player))
              .map((row) => (
              <TableRow 
                key={row.id}
                sx={{ 
                  backgroundColor: row.won ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
                  '&:hover': {
                    backgroundColor: row.won ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)',
                  }
                }}
              >
                <TableCell sx={{ fontWeight: account && account.data && account.data.account_name === row.player ? 'bold' : 'normal' }}>
                  {row.player}
                  {account && account.data && account.data.account_name === row.player && " (you)"}</TableCell>
                <TableCell>{row.bet}</TableCell>
                <TableCell>{row.is_heads ? 'Heads' : 'Tails'}</TableCell>
                <TableCell>{row.won ? 'Won' : 'Lost'}</TableCell>
                <TableCell>{row.payout}</TableCell>
                <TableCell>{new Date(row.timestamp + 'Z').toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>

        </Table>
      </TableContainer>
    </Box>
  );
};

export default CoinFlipGame;
