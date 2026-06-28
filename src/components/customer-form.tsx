import Link from "next/link";

type Customer = {
  id?: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  town?: string | null;
  postcode?: string | null;
  notes?: string | null;
};

type CustomerFormProps = {
  action: (formData: FormData) => Promise<void>;
  customer?: Customer;
  message?: string;
  returnTo?: string;
  submitLabel: string;
};

const fieldClass =
  "field-control";

export function CustomerForm({
  action,
  customer,
  message,
  returnTo = "/customers",
  submitLabel,
}: CustomerFormProps) {
  return (
    <form action={action} className="space-y-5">
      {customer?.id ? <input name="id" type="hidden" value={customer.id} /> : null}
      <input name="return_to" type="hidden" value={returnTo} />

      <div>
        <label className="text-sm font-medium" htmlFor="name">
          Customer name
        </label>
        <input
          className={fieldClass}
          defaultValue={customer?.name ?? ""}
          id="name"
          name="name"
          required
          type="text"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            className={fieldClass}
            defaultValue={customer?.email ?? ""}
            id="email"
            name="email"
            type="email"
          />
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="phone">
            Phone
          </label>
          <input
            className={fieldClass}
            defaultValue={customer?.phone ?? ""}
            id="phone"
            name="phone"
            type="tel"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="address_line_1">
          Address line 1
        </label>
        <input
          className={fieldClass}
          defaultValue={customer?.address_line_1 ?? ""}
          id="address_line_1"
          name="address_line_1"
          type="text"
        />
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="address_line_2">
          Address line 2
        </label>
        <input
          className={fieldClass}
          defaultValue={customer?.address_line_2 ?? ""}
          id="address_line_2"
          name="address_line_2"
          type="text"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="town">
            Town or city
          </label>
          <input
            className={fieldClass}
            defaultValue={customer?.town ?? ""}
            id="town"
            name="town"
            type="text"
          />
        </div>

        <div>
          <label className="text-sm font-medium" htmlFor="postcode">
            Postcode
          </label>
          <input
            className={fieldClass}
            defaultValue={customer?.postcode ?? ""}
            id="postcode"
            name="postcode"
            type="text"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="notes">
          Notes
        </label>
        <textarea
          className={`${fieldClass} min-h-28 resize-y`}
          defaultValue={customer?.notes ?? ""}
          id="notes"
          name="notes"
        />
      </div>

      {message ? (
        <p className="notice">
          {message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          className="btn-secondary px-4"
          href={returnTo}
        >
          Cancel
        </Link>
        <button className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
