import { redirect } from "next/navigation";

// The old signed-in list, replaced by the Library (/library), which has the
// same titles with its tools.
export default function Old() {
  redirect("/library?kind=movies");
}
