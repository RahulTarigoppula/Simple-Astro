import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import "./matchers";
import { configure } from "@testing-library/react";

// The engine does real astronomy inside these tests; on a busy machine the default one-second wait is too short.
configure({ asyncUtilTimeout: 5000 });
