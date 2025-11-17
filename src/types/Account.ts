import {Subject} from "Subject";

type AccountInfo = {
  id: number;
  email?: string;
  address?: string;
  name: string;
  avatar: string;
  avatarGenerated: boolean;
  newsletter: boolean;
};

export interface Account {
  readonly accessToken: string | null;
  subject: Subject<AccountInfo | null>;
  info: null | AccountInfo;
}
