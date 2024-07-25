import { useEffect } from "react";
import Wujie from "../components/Wujie";

export default function SubPage() {
  useEffect(() => {
    window.$wujie?.bus.$on("sub-link-page-bus-event", function (...args) {
      console.log("sub-link-page-bus-event", args);
    });
  }, []);
  return (
    <Wujie
      // alive={true}
      name="react-project"
      url="http://localhost:10000"
      activated={() => console.log("activated")}
    />
  );
}
