import { Route } from "./route";

export interface Zone {
    name: String;
    imageURI?: String;
    routes?: Route[];
}
