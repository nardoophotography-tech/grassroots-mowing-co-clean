import * as React from "react";

type Props = {
  value?: any;
  location?: any;
  onChange?: (value: any) => void;
  onLocationChange?: (value: any) => void;
  onSelect?: (value: any) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  label?: string;
};

export function LocationPicker(props: Props) {
  const initialAddress =
    typeof props.value === "string"
      ? props.value
      : props.value?.address ||
        props.location?.address ||
        "";

  const [address, setAddress] = React.useState(initialAddress);

  function sendLocation(nextAddress: string) {
    setAddress(nextAddress);

    const safeLocation = {
      address: nextAddress,
      formattedAddress: nextAddress,
      suburb: "",
      lat: null,
      lng: null,
      accuracy: null,
      source: "manual_address_fallback",
      googleMapsDisabled: true,
    };

    props.onChange?.(safeLocation);
    props.onLocationChange?.(safeLocation);
    props.onSelect?.(safeLocation);
  }

  return (
    <div className={props.className || "space-y-2"}>
      <label className="block text-sm font-medium text-gray-700">
        {props.label || "Property address"}
      </label>

      <input
        type="text"
        value={address}
        disabled={props.disabled}
        required={props.required}
        placeholder={props.placeholder || "Enter the property address manually"}
        onChange={(event) => sendLocation(event.target.value)}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700 disabled:opacity-60"
      />

      <p className="text-xs text-amber-700">
        Google Maps has been temporarily disabled because it was crashing the booking page. Manual address entry is active.
      </p>

      {props.error ? (
        <p className="text-sm text-red-600">{props.error}</p>
      ) : null}
    </div>
  );
}

export default LocationPicker;
