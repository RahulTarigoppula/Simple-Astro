// #/journey — replay the opening journey any time.
import { useNavigate } from "react-router";
import { Screen } from "../../components/ui/Screen";
import { Journey, markJourneySeen } from "./Journey";

export default function JourneyScreen() {
  const navigate = useNavigate();
  return (
    <Screen className="journey-screen" label="The journey">
      <Journey
        onDone={() => {
          markJourneySeen();
          navigate("/");
        }}
        onStory={() => {
          markJourneySeen();
          navigate("/story");
        }}
      />
    </Screen>
  );
}
