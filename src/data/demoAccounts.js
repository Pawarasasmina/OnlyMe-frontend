import { ROLES } from "../utils/constants";

export const demoAccounts = [
  {
    label: "Fan",
    email: "fan1@gmail.com",
    password: "11112222",
    user: {
      id: "demo-fan-1",
      name: "Fan One",
      email: "fan1@gmail.com",
      role: ROLES.FAN,
    },
  },
  {
    label: "Creator",
    email: "creator1@gmail.com",
    password: "11112222",
    user: {
      id: "demo-creator-1",
      name: "Creator One",
      email: "creator1@gmail.com",
      role: ROLES.CREATOR,
    },
  },
];

export const findDemoAccount = ({ email = "", password = "" }) =>
  demoAccounts.find(
    (account) =>
      account.email.toLowerCase() === email.trim().toLowerCase() &&
      account.password === password
  );
