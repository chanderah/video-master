import { Box, LinearProgress, LinearProgressProps, Typography } from '@mui/material';

const Progress = (props: LinearProgressProps & { value: number; className?: string }) => {
  return (
    <div className={`w-full ${props.className || ''}`}>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress variant='determinate' {...props} />
        </Box>
        <Box sx={{ width: 'auto' }}>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {props.value === 100 ? '✅' : `${Math.round(props.value)}%`}
          </Typography>
        </Box>
      </Box>
    </div>
  );
};

export default Progress;
