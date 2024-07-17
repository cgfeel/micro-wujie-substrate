import Wujie from "../components/Wujie";

export default function ReactPage() {
  return (
    <Wujie
      alive={true}
      name="react-project"
      url="http://localhost:10000"
      activated={() => console.log("activated")}
    />
  );
}
