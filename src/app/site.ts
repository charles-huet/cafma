import { Zone } from "./zone";

export interface Site {
    name: String;
    description: String;
    zones?: Zone[];
  }