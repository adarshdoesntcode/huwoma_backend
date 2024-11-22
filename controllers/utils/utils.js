export const generateBillNo = (clientDate) => {
  const now = new Date(clientDate);

  const year = now.getFullYear().toString().slice(-2);
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const date = ("0" + now.getDate()).slice(-2);

  const randomNumber = Math.floor(1000 + Math.random() * 9000);

  const billNo = `${year}${month}${date}-${randomNumber}W`;

  return billNo;
};

export const generateRaceBillNo = (clientDate) => {
  const now = new Date(clientDate);

  const year = now.getFullYear().toString().slice(-2);
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const date = ("0" + now.getDate()).slice(-2);

  const randomNumber = Math.floor(1000 + Math.random() * 9000);

  const billNo = `${year}${month}${date}-${randomNumber}R`;

  return billNo;
};

export const generateParkingBillNo = (clientDate) => {
  const now = new Date(clientDate);

  const year = now.getFullYear().toString().slice(-2);
  const month = ("0" + (now.getMonth() + 1)).slice(-2);
  const date = ("0" + now.getDate()).slice(-2);

  const randomNumber = Math.floor(1000 + Math.random() * 9000);

  const billNo = `${year}${month}${date}-${randomNumber}P`;

  return billNo;
};
