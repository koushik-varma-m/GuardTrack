import { Box, Typography } from '@mui/material';
import type { BoxProps } from '@mui/system';
import type { ReactNode } from 'react';

interface PageHeaderProps extends BoxProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, subtitle, action, ...props }: PageHeaderProps) {
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="flex-start"
      mb={4}
      {...props}
    >
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: subtitle ? 0.5 : 0 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box>{action}</Box>}
    </Box>
  );
}
