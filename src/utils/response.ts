export const sendResponse = ({
  success,
  message,
  data,
}: {
  success: boolean;
  message: string;
  data: any;
}) => ({
  success,
  message,
  data,
});
