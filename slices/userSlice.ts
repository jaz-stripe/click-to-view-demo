import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  email: string;
  stripeCustomerId: string | null;
  hasPaymentMethod: boolean;
}

const initialState: UserState = {
  email: '',
  stripeCustomerId: null,
  hasPaymentMethod: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserState>) => {
      return { ...state, ...action.payload };
    },
    setHasPaymentMethod: (state, action: PayloadAction<boolean>) => {
      state.hasPaymentMethod = action.payload;
    },
  },
});

export const { setUser, setHasPaymentMethod } = userSlice.actions;
export default userSlice.reducer;
