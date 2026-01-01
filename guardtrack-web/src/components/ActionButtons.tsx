import { IconButton, Tooltip, Box } from '@mui/material';
import type { IconButtonProps } from '@mui/material/IconButton';
import type { ReactNode } from 'react';

interface ActionButtonProps extends Omit<IconButtonProps, 'onClick'> {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

export function ActionButton({ icon, label, onClick, color = 'default', ...props }: ActionButtonProps) {
  return (
    <Tooltip title={label}>
      <IconButton
        color={color}
        onClick={onClick}
        size="small"
        sx={{
          '&:hover': {
            backgroundColor: color === 'error' 
              ? 'error.light' 
              : color === 'primary'
              ? 'primary.light'
              : 'action.hover',
          },
        }}
        {...props}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}

interface ActionButtonsProps {
  actions: Array<{
    icon: ReactNode;
    label: string;
    onClick: () => void;
    color?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  }>;
}

export function ActionButtons({ actions }: ActionButtonsProps) {
  return (
    <Box display="flex" gap={0.5}>
      {actions.map((action, index) => (
        <ActionButton key={index} {...action} />
      ))}
    </Box>
  );
}
