export const money = (n, cur = '₹') =>
  `${cur}${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const dateTime = (iso) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export const STATUSES = ['new', 'confirmed', 'packed', 'delivered', 'cancelled'];

export const STATUS_LABEL = {
  new: 'New', confirmed: 'Confirmed', packed: 'Packed', delivered: 'Delivered', cancelled: 'Cancelled',
};
