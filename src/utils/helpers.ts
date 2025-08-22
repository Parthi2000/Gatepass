export const generateTrackingNumber = (): string => {
  const prefix = 'TRK';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  
  let randomChars = '';
  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0) { // Even positions: prefer letters but sometimes numbers
      if (Math.random() < 0.7) { // 70% chance of letter
        randomChars += letters.charAt(Math.floor(Math.random() * letters.length));
      } else {
        randomChars += digits.charAt(Math.floor(Math.random() * digits.length));
      }
    } else { // Odd positions: prefer numbers but sometimes letters
      if (Math.random() < 0.7) { // 70% chance of number
        randomChars += digits.charAt(Math.floor(Math.random() * digits.length));
      } else {
        randomChars += letters.charAt(Math.floor(Math.random() * letters.length));
      }
    }
  }
  
  return `${prefix}${randomChars}`;
};

export const formatDate = (date: Date | undefined): string => {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'submitted':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'dispatched':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};