interface Props {
  value: string;
  onChange: (value: string) => void;
}

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const MAX_LENGTH = 3;

export function CodeKeypad({ value, onChange }: Props) {
  return (
    <div className="code-keypad">
      <div className="code-keypad-grid">
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            className="code-keypad-btn"
            onClick={() => {
              if (value.length < MAX_LENGTH) onChange(value + digit);
            }}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          className="code-keypad-btn code-keypad-reset"
          onClick={() => onChange("")}
        >
          Сброс
        </button>
      </div>
    </div>
  );
}
