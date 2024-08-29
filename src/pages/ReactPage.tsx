import Wujie from "../components/Wujie";

export default function ReactPage() {
  return (
    <Wujie
      // alive={true}
      sync={true}
      name="react-project"
      url="http://localhost:10000?t=1"
      activated={() => console.log("activated")}
      prefix={{ r: "/" }}
    />
  );
}
