export function getDate(date: string): Date {
  const utcDate = new Date(date);
  const systemDate = new Date(
    utcDate.getTime() - utcDate.getTimezoneOffset() * 60000,
  );
  return systemDate;
}
