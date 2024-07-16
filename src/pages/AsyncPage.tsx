import Wujie from "../components/Wujie";

export default function AsyncPage() {
  return (
    <Wujie
      fiber={false}
      name="async-static-project"
      url="http://localhost:30000/async/"
    />
  );
}
