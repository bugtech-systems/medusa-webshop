import { Button, Drawer, Input, Label, Select, Text } from "@medusajs/ui";
import { AdminUpdateCompany } from "../../../../types1";
import { useState, useEffect, useRef } from "react";
import { useRegions } from "../../../hooks/api";

export function CompanyForm({
  company,
  handleSubmit,
  loading,
  error,
}: {
  company?: AdminUpdateCompany;
  handleSubmit: (data: AdminUpdateCompany) => Promise<void>;
  loading: boolean;
  error: Error | null;
}) {
  const [formData, setFormData] = useState<AdminUpdateCompany>(
    company || ({} as AdminUpdateCompany)
  );
  
  const [handleManuallyEdited, setHandleManuallyEdited] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const { regions, isPending: regionsLoading } = useRegions();

  const currencyCodes = regions?.map((region) => region.currency_code);
  const countries = regions?.flatMap((region) => region.countries);

  // Auto-generate handle from company name
  const generateHandle = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
      .replace(/^-+|-+$/g, ''); // Trim hyphens from start and end
  };

  // Update handle when company name changes, but only if not manually edited
  useEffect(() => {
    if (!handleManuallyEdited && formData.name) {
      const generatedHandle = generateHandle(formData.name);
      setFormData(prev => ({
        ...prev,
        handle: generatedHandle
      }));
    }
  }, [formData.name, handleManuallyEdited]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // If handle is being edited, set the manual edit flag
    if (name === 'handle') {
      setHandleManuallyEdited(true);
    }
    
    setFormData({ ...formData, [name]: value });
  };

  const handleCurrencyChange = (value: string) => {
    setFormData({ ...formData, currency_code: value });
  };

  const handleCountryChange = (value: string) => {
    setFormData({ ...formData, country: value });
  };

  // Reset manual edit flag when company changes (for edit mode)
  useEffect(() => {
    if (company?.handle) {
      setHandleManuallyEdited(true);
    } else {
      setHandleManuallyEdited(false);
    }
  }, [company]);

  return (
    <form>
      <Drawer.Body className="p-4 overflow-y-auto max-h-[calc(100vh-200px)]" ref={contentRef}>
        <div className="flex flex-col gap-4">
          {/* Company Name */}
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="font-medium">Company Name</Label>
            <Input
              type="text"
              name="name"
              value={formData.name || ""}
              onChange={handleChange}
              placeholder="Medusa"
              required
            />
          </div>

          {/* Company Handle - Auto-populated */}
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="font-medium">Company Handle</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="text"
                  name="handle"
                  value={formData.handle || ""}
                  onChange={handleChange}
                  placeholder="medusa-store"
                  className={!handleManuallyEdited ? "border-ui-border-interactive" : ""}
                />
              </div>
              {!handleManuallyEdited && formData.name && (
                <Text size="small" className="text-ui-fg-interactive whitespace-nowrap">
                  Auto-generated
                </Text>
              )}
            </div>
            <Text size="small" className="text-ui-fg-subtle">
              Unique identifier for your company. Auto-generated from company name.
            </Text>
          </div>

          {/* Company Phone */}
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="font-medium">Company Phone</Label>
            <Input
              type="tel"
              name="phone"
              value={formData.phone || ""}
              onChange={handleChange}
              placeholder="1234567890"
            />
          </div>

          {/* Company Email */}
          <div className="flex flex-col gap-2">
            <Label size="xsmall" className="font-medium">Company Email</Label>
            <Input
              type="email"
              name="email"
              value={formData.email || ""}
              onChange={handleChange}
              placeholder="medusa@medusa.com"
              required
            />
          </div>

          {/* Address Section */}
          <div className="border-t border-ui-border-base pt-4 mt-2">
            <Text size="small" className="font-medium mb-3">Address Information</Text>
            
            {/* Company Address */}
            <div className="flex flex-col gap-2 mb-3">
              <Label size="xsmall" className="font-medium">Street Address</Label>
              <Input
                type="text"
                name="address"
                value={formData.address || ""}
                onChange={handleChange}
                placeholder="1234 Main St"
              />
            </div>

            {/* City and State Row */}
            <div className="flex gap-4 w-full mb-3">
              <div className="flex flex-col gap-2 w-1/2">
                <Label size="xsmall" className="font-medium">City</Label>
                <Input
                  type="text"
                  name="city"
                  value={formData.city || ""}
                  onChange={handleChange}
                  placeholder="New York"
                />
              </div>
              <div className="flex flex-col gap-2 w-1/2">
                <Label size="xsmall" className="font-medium">State/Province</Label>
                <Input
                  type="text"
                  name="state"
                  value={formData.state || ""}
                  onChange={handleChange}
                  placeholder="NY"
                />
              </div>
            </div>

            {/* Zip and Country Row */}
            <div className="flex gap-4 w-full">
              <div className="flex flex-col gap-2 w-1/2">
                <Label size="xsmall" className="font-medium">ZIP/Postal Code</Label>
                <Input
                  type="text"
                  name="zip"
                  value={formData.zip || ""}
                  onChange={handleChange}
                  placeholder="10001"
                />
              </div>
              <div className="flex flex-col gap-2 w-1/2">
                <Label size="xsmall" className="font-medium">Country</Label>
                <Select
                  name="country"
                  value={formData.country || ""}
                  onValueChange={handleCountryChange}
                  disabled={regionsLoading}
                >
                  <Select.Trigger disabled={regionsLoading}>
                    <Select.Value placeholder="Select a country" />
                  </Select.Trigger>
                  <Select.Content className="z-50 max-h-[300px]">
                    {countries?.map((country) => (
                      <Select.Item
                        key={country?.iso_2 || ""}
                        value={country?.iso_2 || ""}
                      >
                        {country?.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            </div>
          </div>

          {/* Currency and Logo Section */}
          <div className="border-t border-ui-border-base pt-4 mt-2">
            <Text size="small" className="font-medium mb-3">Business Settings</Text>
            
            {/* Currency */}
            <div className="flex flex-col gap-2 mb-3">
              <Label size="xsmall" className="font-medium">Default Currency</Label>
              <Select
                name="currency_code"
                value={formData.currency_code || ""}
                onValueChange={handleCurrencyChange}
                defaultValue={currencyCodes?.[0]}
                disabled={regionsLoading}
              >
                <Select.Trigger disabled={regionsLoading}>
                  <Select.Value placeholder="Select a currency" />
                </Select.Trigger>
                <Select.Content className="z-50 max-h-[300px]">
                  {currencyCodes?.map((currencyCode) => (
                    <Select.Item key={currencyCode} value={currencyCode}>
                      {currencyCode.toUpperCase()}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            {/* Logo URL */}
            <div className="flex flex-col gap-2">
              <Label size="xsmall" className="font-medium">Company Logo URL</Label>
              <Input
                type="url"
                name="logo_url"
                value={formData.logo_url || ""}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
              />
              <Text size="small" className="text-ui-fg-subtle">
                Provide a URL to your company logo (optional)
              </Text>
            </div>
          </div>
        </div>
      </Drawer.Body>
      
      <Drawer.Footer className="border-t border-ui-border-base">
        <div className="flex items-center justify-end gap-2 w-full">
          {error && (
            <Text className="txt-compact-small text-ui-fg-warning mr-auto">
              Error: {error?.message}
            </Text>
          )}
          <Drawer.Close asChild>
            <Button variant="secondary">Cancel</Button>
          </Drawer.Close>
          <Button
            isLoading={loading}
            onClick={() => handleSubmit(formData)}
          >
            Save
          </Button>
        </div>
      </Drawer.Footer>
    </form>
  );
}