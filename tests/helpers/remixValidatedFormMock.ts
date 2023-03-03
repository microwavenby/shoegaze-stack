// Could you add a blurb about what this file is for?
export const helpers = {
  error: undefined,
  touched: false,
  clearError: jest.fn(),
  validate: jest.fn(),
  setTouched: jest.fn(),
  defaultValue: "test default value",
};

type MinimalInputProps = {
  onChange?: (...args: any[]) => void;
  onBlur?: (...args: any[]) => void;
  defaultValue?: any;
  defaultChecked?: boolean;
  name?: string;
  type?: string;
};

export const getInputProps = <T extends MinimalInputProps>(
  props = {} as any
) => {
  return props as T;
};

export const mockUseFieldReturnValue = { ...helpers, getInputProps };
