import type { ServiceBookEntry, Vehicle } from '@shared/types/index';

export interface WorkType {
  type: string;
  label: string;
  icon: string;
  /** Рекомендуемый интервал до следующей замены. */
  intervalKm?: number;
  intervalMonths?: number;
}

export const workTypes: WorkType[] = [
  { type: 'oil_change', label: 'Замена масла ДВС', icon: '🛢️', intervalKm: 10000, intervalMonths: 12 },
  { type: 'gearbox_oil', label: 'Замена масла АКПП/КПП', icon: '⚙️', intervalKm: 60000, intervalMonths: 48 },
  { type: 'filters', label: 'Замена фильтров', icon: '🌬️', intervalKm: 15000, intervalMonths: 12 },
  { type: 'brake_pads', label: 'Тормозные колодки', icon: '🛑', intervalKm: 30000 },
  { type: 'brake_discs', label: 'Тормозные диски', icon: '💿', intervalKm: 60000 },
  { type: 'spark_plugs', label: 'Свечи зажигания', icon: '✨', intervalKm: 30000 },
  { type: 'timing_belt', label: 'Ремень ГРМ', icon: '⛓️', intervalKm: 60000, intervalMonths: 60 },
  { type: 'coolant', label: 'Замена антифриза', icon: '❄️', intervalKm: 60000, intervalMonths: 36 },
  { type: 'suspension', label: 'Ремонт ходовой части', icon: '🚗' },
  { type: 'tire_change', label: 'Шиномонтаж / смена резины', icon: '🔄', intervalMonths: 6 },
  { type: 'engine_overhaul', label: 'Капремонт двигателя', icon: '🔧' },
  { type: 'diagnostics', label: 'Диагностика', icon: '💻', intervalMonths: 12 },
  { type: 'other', label: 'Другое', icon: '📝' },
];

export function workType(type: string): WorkType {
  return workTypes.find((item) => item.type === type) ?? workTypes[workTypes.length - 1];
}

export const engineTypes = [
  { value: 'petrol', label: 'Бензин' },
  { value: 'diesel', label: 'Дизель' },
  { value: 'gas', label: 'Газ/бензин' },
  { value: 'hybrid', label: 'Гибрид' },
  { value: 'electric', label: 'Электро' },
];

export const transmissions = [
  { value: 'auto', label: 'Автомат' },
  { value: 'manual', label: 'Механика' },
  { value: 'cvt', label: 'Вариатор' },
  { value: 'robot', label: 'Робот' },
];

export function optionLabel(options: { value: string; label: string }[], value?: string | null) {
  if (!value) return '';
  return options.find((option) => option.value === value)?.label ?? value;
}

/** «Toyota Camry 2018 · 2.5 л · Бензин · Автомат» */
export function vehicleSummary(vehicle: {
  make?: string | null;
  model?: string | null;
  year?: number | null;
  engine_volume?: string | null;
  engine_type?: string | null;
  transmission?: string | null;
}) {
  const title = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ');
  const details = [
    vehicle.engine_volume ? `${vehicle.engine_volume} л` : '',
    optionLabel(engineTypes, vehicle.engine_type),
    optionLabel(transmissions, vehicle.transmission),
  ].filter(Boolean);
  return { title, details: details.join(' · ') };
}

export function formatKm(value: number) {
  return `${Math.round(value).toLocaleString('ru-RU')} км`;
}

export function formatDate(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Разбирает «ДД.ММ.ГГГГ» в дату; null, если формат неверный. */
export function parseDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

/** Дата в формате API (YYYY-MM-DD) без сдвига часового пояса. */
export function toApiDate(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export type ReminderStatus = 'overdue' | 'soon' | 'ok';

export interface UpcomingWork {
  entry: ServiceBookEntry;
  work: WorkType;
  kmLeft?: number;
  daysLeft?: number;
  status: ReminderStatus;
}

const SOON_KM = 1000;
const SOON_DAYS = 30;

/**
 * Для каждого вида работ берёт последнюю запись и считает, сколько осталось
 * до следующей замены по пробегу и по дате. Самые срочные — первыми.
 */
export function upcomingWorks(entries: ServiceBookEntry[], vehicle: Pick<Vehicle, 'current_mileage'>) {
  const latestByType = new Map<string, ServiceBookEntry>();
  for (const entry of entries) {
    const current = latestByType.get(entry.entry_type);
    if (!current || new Date(entry.serviced_at) > new Date(current.serviced_at)) {
      latestByType.set(entry.entry_type, entry);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mileage = vehicle.current_mileage ?? 0;
  const result: UpcomingWork[] = [];

  for (const entry of latestByType.values()) {
    if (entry.next_service_mileage == null && !entry.next_service_date) continue;
    const kmLeft = entry.next_service_mileage != null ? entry.next_service_mileage - mileage : undefined;
    const daysLeft = entry.next_service_date
      ? Math.round((new Date(`${entry.next_service_date}T00:00:00`).getTime() - today.getTime()) / 86_400_000)
      : undefined;

    let status: ReminderStatus = 'ok';
    if ((kmLeft != null && kmLeft <= 0) || (daysLeft != null && daysLeft <= 0)) status = 'overdue';
    else if ((kmLeft != null && kmLeft <= SOON_KM) || (daysLeft != null && daysLeft <= SOON_DAYS)) status = 'soon';

    result.push({ entry, work: workType(entry.entry_type), kmLeft, daysLeft, status });
  }

  const rank: Record<ReminderStatus, number> = { overdue: 0, soon: 1, ok: 2 };
  return result.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      (a.kmLeft ?? Number.MAX_SAFE_INTEGER) - (b.kmLeft ?? Number.MAX_SAFE_INTEGER) ||
      (a.daysLeft ?? Number.MAX_SAFE_INTEGER) - (b.daysLeft ?? Number.MAX_SAFE_INTEGER),
  );
}

/** «через 1 200 км или 45 дн.» / «просрочено на 300 км» */
export function upcomingText(item: UpcomingWork) {
  const parts: string[] = [];
  if (item.kmLeft != null) {
    parts.push(item.kmLeft > 0 ? `через ${formatKm(item.kmLeft)}` : `просрочено на ${formatKm(-item.kmLeft)}`);
  }
  if (item.daysLeft != null) {
    parts.push(item.daysLeft > 0 ? `через ${item.daysLeft} дн.` : `срок прошёл ${formatDate(item.entry.next_service_date!)}`);
  }
  return parts.join(' или ');
}

export const reminderColors: Record<ReminderStatus, { text: string; background: string }> = {
  overdue: { text: '#b42318', background: '#fef3f2' },
  soon: { text: '#b54708', background: '#fffaeb' },
  ok: { text: '#067647', background: '#ecfdf3' },
};
