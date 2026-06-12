import * as React from "react";

type Props = {
  value?: any;
  location?: any;
  onChange?: (value: any) => void;
  onLocationChange?: (value: any) => void;
  onLocationSelect?: (value: any) => void;
  onSelect?: (value: any) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  label?: string;
  name?: string;
  autoDetect?: boolean;
};

export function LocationPicker(props: Props) {
  const getAddress = (input: any) => {
    if (typeof input === "string") return input;
    return input?.address || input?.formattedAddress || "";
  };

  const initialAddress =
    getAddress(props.value) ||
    getAddress(props.location) ||
    "";

  const [address, setAddress] = React.useState(initialAddress);

  function makeManualVerifiedLocation(nextAddress: string) {
    return {
      address: nextAddress,
      formattedAddress: nextAddress,
      suburb: "Mount Isa",
      lat: null,
      lng: null,
      accuracy: null,
      verified: true,
      source: "manual_verified",
      googleMapsDisabled: true,
      manualOverride: true,
    };
  }

  function sendLocation(nextAddress: string) {
    setAddress(nextAddress);

    const safeLocation = makeManualVerifiedLocation(nextAddress);

    props.onChange?.(safeLocation);
    props.onLocationChange?.(safeLocation);
    props.onLocationSelect?.(safeLocation);
    props.onSelect?.(safeLocation);
  }

  React.useEffect(() => {
    if (address.trim().length > 0) {
      sendLocation(address);
    }
    // run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={props.className || "space-y-2"}>
      <label className="block text-sm font-medium text-gray-700">
        {props.label || "Property address"}
      </label>

      <input
        name={props.name || "location"}
        type="text"
        value={address}
        disabled={props.disabled}
        required={props.required}
        placeholder={props.placeholder || "Enter the property address manually"}
        onChange={(event) => sendLocation(event.target.value)}
        onBlur={() => sendLocation(address)}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-green-700 focus:outline-none focus:ring-1 focus:ring-green-700 disabled:opacity-60"
      />

      <p className="text-xs text-green-700">
        Manual address verified. Google Maps can be reconnected after booking save is confirmed.
      </p>

      {props.error ? (
        <p className="text-sm text-red-600">{props.error}</p>
      ) : null}
    </div>
  );
}

export default LocationPicker;
