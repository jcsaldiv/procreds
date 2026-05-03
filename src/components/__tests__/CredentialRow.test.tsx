import { render, fireEvent } from '@testing-library/react-native';
import { CredentialRow } from '../CredentialRow';

test('renders name and fires onPress', () => {
  const onPress = jest.fn();
  const { getByText } = render(
    <CredentialRow id="1" name="RN License" expirationDate={null} onPress={onPress} />
  );
  fireEvent.press(getByText('RN License'));
  expect(onPress).toHaveBeenCalledWith('1');
});
