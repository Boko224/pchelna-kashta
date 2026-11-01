export const ORDER_STATUSES = {
  new: 'Нова',
  confirmed: 'Потвърдена',
  shipped: 'Изпратена',
  completed: 'Завършена',
  cancelled: 'Отказана',
};

export const PAYMENT_METHODS = {
  cod: 'Наложен платеж',
  bank: 'Банков превод',
};

export function StatusBadge({ status }) {
  return <span className={`status status--${status}`}>{ORDER_STATUSES[status] || status}</span>;
}
