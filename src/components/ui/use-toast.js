import { useState, useEffect } from "react";

let memoryState = [];
let listeners = [];

const dispatch = (action) => {
  if (action.type === "ADD_TOAST") {
    memoryState = [...memoryState, action.toast];
  } else if (action.type === "REMOVE_TOAST") {
    memoryState = memoryState.filter((t) => t.id !== action.id);
  }
  listeners.forEach((listener) => listener(memoryState));
};

export function toast(props) {
  const id = Math.random().toString(36).substring(2, 9);
  dispatch({ type: "ADD_TOAST", toast: { ...props, id } });
  
  setTimeout(() => {
    dispatch({ type: "REMOVE_TOAST", id });
  }, 5000);
}

export function useToast() {
  const [toasts, setToasts] = useState(memoryState);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  return { toast, toasts };
}
