import axios from "axios";
import { BACKEND_URL } from "../contexts/Web3Provider";

export async function deleteItemFromBackend(address, itemId) {
  await axios.delete(`${BACKEND_URL}/inventory/${address}/${itemId}`);
}