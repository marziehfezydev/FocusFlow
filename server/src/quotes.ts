import type { Lang, Quote } from '../../shared/types';

const EN: [string, string][] = [
  ['Small steps every day lead to big results.', 'Unknown'],
  ['A journey of a thousand miles begins with a single step.', 'Lao Tzu'],
  ['We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'Will Durant'],
  ['It does not matter how slowly you go as long as you do not stop.', 'Confucius'],
  ['Success is the sum of small efforts, repeated day in and day out.', 'Robert Collier'],
  ['Knowing is not enough; we must apply.', 'Johann Wolfgang von Goethe'],
  ['You don’t have to be great to start, but you have to start to be great.', 'Zig Ziglar'],
  ['The best time to plant a tree was twenty years ago. The second best time is now.', 'Proverb'],
  ['Fall seven times, stand up eight.', 'Japanese proverb'],
  ['The expert in anything was once a beginner.', 'Helen Hayes'],
  ['Well begun is half done.', 'Proverb'],
  ['Rome wasn’t built in a day.', 'Proverb'],
  ['Energy and persistence conquer all things.', 'Benjamin Franklin'],
  ['Little by little, one travels far.', 'J.R.R. Tolkien'],
];

const FA: [string, string][] = [
  ['هر روز قدم کوچکی بردار، همین قدم‌ها مسیر بزرگی می‌سازند.', 'ناشناس'],
  ['قطره قطره جمع گردد وانگهی دریا شود.', 'ضرب‌المثل'],
  ['توانا بود هر که دانا بود.', 'فردوسی'],
  ['کار امروز را به فردا مینداز.', 'ضرب‌المثل'],
  ['باران، ز یک قطره آغاز می‌شود.', 'ضرب‌المثل'],
  ['سفر هزار فرسنگی با یک قدم آغاز می‌شود.', 'لائوتزو'],
  ['آهسته و پیوسته، رسد به منزل.', 'ضرب‌المثل'],
  ['شروع کردن، نیمی از راه است.', 'ضرب‌المثل'],
];

function dayOfYear(date: string): number {
  const d = new Date(date + 'T12:00:00');
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

export function quoteFor(date: string, lang: Lang): Quote {
  const list = lang === 'fa' ? FA : EN;
  const [text, author] = list[dayOfYear(date) % list.length];
  return { text, author, lang };
}
