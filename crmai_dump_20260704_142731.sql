--
-- PostgreSQL database dump
--

\restrict C9kn5ndhhvea8oEwnOBqurdpTm7dIm5JxhpBk3M1VywZi3D7Vbmhu1et2tyurpi

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: access_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.access_audit_log (
    id integer NOT NULL,
    screen_key text NOT NULL,
    role_key text NOT NULL,
    previous_level text,
    new_level text NOT NULL,
    changed_by_user_id integer,
    changed_by_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.access_audit_log OWNER TO postgres;

--
-- Name: access_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.access_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.access_audit_log_id_seq OWNER TO postgres;

--
-- Name: access_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.access_audit_log_id_seq OWNED BY public.access_audit_log.id;


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.accounts (
    id integer NOT NULL,
    name text NOT NULL,
    industry text,
    website text,
    phone text,
    email text,
    address text,
    city text,
    country text,
    employees integer,
    annual_revenue numeric(15,2),
    description text,
    status text DEFAULT 'active'::text,
    stage text,
    amount numeric(15,2),
    close_date text,
    probability integer,
    forecast_category text,
    next_step text,
    opty_owner text,
    opty_team text,
    clm_enabled boolean DEFAULT false NOT NULL,
    owner_id integer,
    created_by integer,
    modified_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounts_id_seq OWNER TO postgres;

--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    id integer NOT NULL,
    type text NOT NULL,
    subject text NOT NULL,
    description text,
    status text DEFAULT 'planned'::text NOT NULL,
    due_date timestamp without time zone,
    completed_at timestamp without time zone,
    lead_id integer,
    contact_id integer,
    opportunity_id integer,
    account_id integer,
    assigned_to integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- Name: activities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activities_id_seq OWNER TO postgres;

--
-- Name: activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activities_id_seq OWNED BY public.activities.id;


--
-- Name: allowed_users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.allowed_users (
    id integer NOT NULL,
    email text NOT NULL,
    name text,
    role text DEFAULT 'sales'::text NOT NULL,
    google_id text,
    avatar_url text,
    added_by_email text,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.allowed_users OWNER TO postgres;

--
-- Name: allowed_users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.allowed_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.allowed_users_id_seq OWNER TO postgres;

--
-- Name: allowed_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.allowed_users_id_seq OWNED BY public.allowed_users.id;


--
-- Name: app_modules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_modules (
    key text NOT NULL,
    label text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    is_core boolean DEFAULT false NOT NULL,
    sort_order integer DEFAULT 100 NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.app_modules OWNER TO postgres;

--
-- Name: approval_audit_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_audit_events (
    id integer NOT NULL,
    request_id integer NOT NULL,
    event text NOT NULL,
    actor_user_id integer,
    actor_name text,
    comment text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.approval_audit_events OWNER TO postgres;

--
-- Name: approval_audit_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approval_audit_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approval_audit_events_id_seq OWNER TO postgres;

--
-- Name: approval_audit_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approval_audit_events_id_seq OWNED BY public.approval_audit_events.id;


--
-- Name: approval_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_configs (
    id integer NOT NULL,
    entity text NOT NULL,
    multi_level boolean DEFAULT false NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.approval_configs OWNER TO postgres;

--
-- Name: approval_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approval_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approval_configs_id_seq OWNER TO postgres;

--
-- Name: approval_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approval_configs_id_seq OWNED BY public.approval_configs.id;


--
-- Name: approval_criteria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_criteria (
    id integer NOT NULL,
    entity text NOT NULL,
    name text NOT NULL,
    field text NOT NULL,
    operator text NOT NULL,
    threshold numeric(18,4),
    threshold_text text,
    level integer DEFAULT 1 NOT NULL,
    role_id integer,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.approval_criteria OWNER TO postgres;

--
-- Name: approval_criteria_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approval_criteria_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approval_criteria_id_seq OWNER TO postgres;

--
-- Name: approval_criteria_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approval_criteria_id_seq OWNED BY public.approval_criteria.id;


--
-- Name: approval_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_requests (
    id integer NOT NULL,
    entity text NOT NULL,
    entity_id integer NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    role_id integer,
    criterion_id integer,
    rule_key text,
    requested_by integer,
    requested_at timestamp without time zone DEFAULT now() NOT NULL,
    decided_by integer,
    decided_at timestamp without time zone,
    comment text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.approval_requests OWNER TO postgres;

--
-- Name: approval_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approval_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approval_requests_id_seq OWNER TO postgres;

--
-- Name: approval_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approval_requests_id_seq OWNED BY public.approval_requests.id;


--
-- Name: approval_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approval_roles (
    id integer NOT NULL,
    name text NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.approval_roles OWNER TO postgres;

--
-- Name: approval_roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.approval_roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.approval_roles_id_seq OWNER TO postgres;

--
-- Name: approval_roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.approval_roles_id_seq OWNED BY public.approval_roles.id;


--
-- Name: campaign_engagements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaign_engagements (
    id integer NOT NULL,
    campaign_id integer,
    platform text NOT NULL,
    event_type text NOT NULL,
    engagement_score integer DEFAULT 1 NOT NULL,
    interest_category text DEFAULT 'cold'::text NOT NULL,
    lead_id integer,
    contact_id integer,
    platform_user_id text,
    platform_user_name text,
    platform_user_email text,
    platform_user_phone text,
    anonymous_id text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    metadata jsonb,
    raw_payload jsonb,
    occurred_at timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campaign_engagements OWNER TO postgres;

--
-- Name: campaign_engagements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.campaign_engagements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaign_engagements_id_seq OWNER TO postgres;

--
-- Name: campaign_engagements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.campaign_engagements_id_seq OWNED BY public.campaign_engagements.id;


--
-- Name: campaign_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaign_members (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    contact_id integer,
    lead_id integer,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    company_name text,
    role text,
    status text DEFAULT 'pending'::text NOT NULL,
    sent_at timestamp without time zone,
    opened_at timestamp without time zone,
    clicked_at timestamp without time zone,
    bounced_at timestamp without time zone,
    unsubscribed_at timestamp without time zone,
    source text DEFAULT 'manual'::text NOT NULL,
    added_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campaign_members OWNER TO postgres;

--
-- Name: campaign_members_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.campaign_members_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaign_members_id_seq OWNER TO postgres;

--
-- Name: campaign_members_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.campaign_members_id_seq OWNED BY public.campaign_members.id;


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.campaigns (
    id integer NOT NULL,
    name text NOT NULL,
    type text DEFAULT 'email'::text NOT NULL,
    status text DEFAULT 'planning'::text NOT NULL,
    start_date timestamp without time zone,
    end_date timestamp without time zone,
    budget numeric(15,2),
    actual_cost numeric(15,2),
    expected_revenue numeric(15,2),
    description text,
    target_audience text,
    channels text,
    team_members text,
    goals text,
    launched_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.campaigns OWNER TO postgres;

--
-- Name: campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.campaigns_id_seq OWNER TO postgres;

--
-- Name: campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.campaigns_id_seq OWNED BY public.campaigns.id;


--
-- Name: cases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cases (
    id integer NOT NULL,
    case_number text NOT NULL,
    subject text NOT NULL,
    description text,
    status text DEFAULT 'new'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    type text,
    origin text,
    contact_id integer,
    account_id integer,
    assigned_to integer,
    resolution text,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cases OWNER TO postgres;

--
-- Name: cases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.cases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cases_id_seq OWNER TO postgres;

--
-- Name: cases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.cases_id_seq OWNED BY public.cases.id;


--
-- Name: clm_notification_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clm_notification_rules (
    id integer NOT NULL,
    name text NOT NULL,
    event text NOT NULL,
    recipients text DEFAULT '[]'::text NOT NULL,
    channels text DEFAULT '["email"]'::text NOT NULL,
    trigger_days_before integer,
    message_template text,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clm_notification_rules OWNER TO postgres;

--
-- Name: clm_notification_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clm_notification_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clm_notification_rules_id_seq OWNER TO postgres;

--
-- Name: clm_notification_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clm_notification_rules_id_seq OWNED BY public.clm_notification_rules.id;


--
-- Name: clm_redlines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clm_redlines (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    author_id integer,
    round integer DEFAULT 1 NOT NULL,
    section text,
    original_text text,
    proposed_text text,
    change_type text DEFAULT 'modification'::text NOT NULL,
    party text DEFAULT 'counterparty'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clm_redlines OWNER TO postgres;

--
-- Name: clm_redlines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clm_redlines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clm_redlines_id_seq OWNER TO postgres;

--
-- Name: clm_redlines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clm_redlines_id_seq OWNED BY public.clm_redlines.id;


--
-- Name: clm_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clm_reviews (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    reviewer_id integer,
    stage text DEFAULT 'legal'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    decision text,
    due_date date,
    decision_date date,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clm_reviews OWNER TO postgres;

--
-- Name: clm_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clm_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clm_reviews_id_seq OWNER TO postgres;

--
-- Name: clm_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clm_reviews_id_seq OWNED BY public.clm_reviews.id;


--
-- Name: clm_signers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clm_signers (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    title text,
    role text DEFAULT 'signer'::text NOT NULL,
    signing_order integer DEFAULT 1 NOT NULL,
    party text DEFAULT 'counterparty'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    signed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clm_signers OWNER TO postgres;

--
-- Name: clm_signers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clm_signers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clm_signers_id_seq OWNER TO postgres;

--
-- Name: clm_signers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clm_signers_id_seq OWNED BY public.clm_signers.id;


--
-- Name: clm_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clm_templates (
    id integer NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'MSA'::text NOT NULL,
    description text,
    content text,
    variables text DEFAULT '[]'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clm_templates OWNER TO postgres;

--
-- Name: clm_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clm_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clm_templates_id_seq OWNER TO postgres;

--
-- Name: clm_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clm_templates_id_seq OWNED BY public.clm_templates.id;


--
-- Name: clm_workflow_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clm_workflow_rules (
    id integer NOT NULL,
    name text NOT NULL,
    trigger_event text NOT NULL,
    conditions text DEFAULT '[]'::text NOT NULL,
    actions text DEFAULT '[]'::text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.clm_workflow_rules OWNER TO postgres;

--
-- Name: clm_workflow_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clm_workflow_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clm_workflow_rules_id_seq OWNER TO postgres;

--
-- Name: clm_workflow_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clm_workflow_rules_id_seq OWNED BY public.clm_workflow_rules.id;


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id integer NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    mobile text,
    title text,
    department text,
    account_id integer,
    owner_id integer,
    lead_source text,
    address text,
    city text,
    country text,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contacts_id_seq OWNER TO postgres;

--
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- Name: contract_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_documents (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    version integer NOT NULL,
    title text,
    content text NOT NULL,
    change_summary text,
    created_by_user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT false NOT NULL
);


ALTER TABLE public.contract_documents OWNER TO postgres;

--
-- Name: contract_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contract_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contract_documents_id_seq OWNER TO postgres;

--
-- Name: contract_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contract_documents_id_seq OWNED BY public.contract_documents.id;


--
-- Name: contract_line_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contract_line_items (
    id integer NOT NULL,
    contract_id integer NOT NULL,
    product_id integer,
    product_name text NOT NULL,
    quantity numeric(10,2) DEFAULT '1'::numeric NOT NULL,
    list_price numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    discount numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.contract_line_items OWNER TO postgres;

--
-- Name: contract_line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contract_line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contract_line_items_id_seq OWNER TO postgres;

--
-- Name: contract_line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contract_line_items_id_seq OWNED BY public.contract_line_items.id;


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contracts (
    id integer NOT NULL,
    contract_number text NOT NULL,
    name text NOT NULL,
    account_id integer,
    contact_id integer,
    opportunity_id integer,
    price_book_id integer,
    owner_id integer,
    status text DEFAULT 'draft'::text NOT NULL,
    start_date timestamp without time zone,
    contract_term_months integer,
    end_date timestamp without time zone,
    signed_date timestamp without time zone,
    company_signed_by_id integer,
    customer_signed_by_contact_id integer,
    auto_renew boolean DEFAULT false NOT NULL,
    renewal_term_months integer,
    special_terms text,
    description text,
    subtotal numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    tax numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    activated_at timestamp without time zone,
    terminated_at timestamp without time zone,
    termination_reason text,
    created_by_user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    contract_type text,
    territory text,
    business_unit text,
    priority text DEFAULT 'Medium'::text,
    governing_law text,
    payment_terms text,
    liability_cap_multiplier numeric,
    confidentiality_period_years integer,
    ip_ownership text,
    termination_notice_days integer,
    counterparty_company text,
    counterparty_signer_name text,
    counterparty_signer_email text,
    counterparty_signer_title text,
    counterparty_address text,
    signing_provider text,
    signing_order text DEFAULT 'Sequential'::text,
    signing_deadline date,
    renewal_status text,
    renewal_decision_date date,
    renewal_window_days integer DEFAULT 90,
    arr_at_risk numeric,
    yearly_escalation_pct numeric,
    minimum_annual_commit numeric,
    risk_score integer,
    redline_round integer DEFAULT 0,
    template_id integer
);


ALTER TABLE public.contracts OWNER TO postgres;

--
-- Name: contracts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contracts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contracts_id_seq OWNER TO postgres;

--
-- Name: contracts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contracts_id_seq OWNED BY public.contracts.id;


--
-- Name: email_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_attachments (
    id integer NOT NULL,
    tracking_id integer NOT NULL,
    token text NOT NULL,
    filename text NOT NULL,
    content_type text,
    size_bytes integer DEFAULT 0 NOT NULL,
    content bytea NOT NULL,
    open_count integer DEFAULT 0 NOT NULL,
    opened_at timestamp without time zone,
    last_opened_at timestamp without time zone,
    last_ip text,
    last_user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_attachments OWNER TO postgres;

--
-- Name: email_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_attachments_id_seq OWNER TO postgres;

--
-- Name: email_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_attachments_id_seq OWNED BY public.email_attachments.id;


--
-- Name: email_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_settings (
    id integer NOT NULL,
    imap_host text DEFAULT 'mail.spacemail.com'::text NOT NULL,
    imap_port integer DEFAULT 993 NOT NULL,
    imap_user text,
    imap_password text,
    imap_secure boolean DEFAULT true NOT NULL,
    smtp_host text DEFAULT 'mail.spacemail.com'::text NOT NULL,
    smtp_port integer DEFAULT 465 NOT NULL,
    smtp_user text,
    smtp_password text,
    smtp_secure boolean DEFAULT true NOT NULL,
    smtp_from_name text,
    sync_enabled boolean DEFAULT false NOT NULL,
    sync_interval_minutes integer DEFAULT 15 NOT NULL,
    last_sync_at timestamp without time zone,
    last_sync_status text,
    last_sync_message text,
    emails_processed integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.email_settings OWNER TO postgres;

--
-- Name: email_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_settings_id_seq OWNER TO postgres;

--
-- Name: email_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_settings_id_seq OWNED BY public.email_settings.id;


--
-- Name: email_tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_tracking (
    id integer NOT NULL,
    activity_id integer NOT NULL,
    token text NOT NULL,
    message_id text,
    to_email text,
    subject text,
    sent_at timestamp without time zone DEFAULT now() NOT NULL,
    opened_at timestamp without time zone,
    last_opened_at timestamp without time zone,
    open_count integer DEFAULT 0 NOT NULL,
    last_ip text,
    last_user_agent text
);


ALTER TABLE public.email_tracking OWNER TO postgres;

--
-- Name: email_tracking_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.email_tracking_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.email_tracking_id_seq OWNER TO postgres;

--
-- Name: email_tracking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.email_tracking_id_seq OWNED BY public.email_tracking.id;


--
-- Name: emails; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emails (
    id integer NOT NULL,
    message_uid text,
    message_id text,
    in_reply_to text,
    from_email text NOT NULL,
    from_name text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    body_html text,
    status text DEFAULT 'new'::text NOT NULL,
    related_contact_id integer,
    related_lead_id integer,
    related_opportunity_id integer,
    is_known_customer text DEFAULT 'false'::text NOT NULL,
    notes text,
    auto_replied_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.emails OWNER TO postgres;

--
-- Name: emails_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.emails_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.emails_id_seq OWNER TO postgres;

--
-- Name: emails_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.emails_id_seq OWNED BY public.emails.id;


--
-- Name: enquiries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.enquiries (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    company text,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.enquiries OWNER TO postgres;

--
-- Name: enquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.enquiries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.enquiries_id_seq OWNER TO postgres;

--
-- Name: enquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.enquiries_id_seq OWNED BY public.enquiries.id;


--
-- Name: entity_notes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_notes (
    id integer NOT NULL,
    entity_type text NOT NULL,
    entity_id integer NOT NULL,
    body text DEFAULT ''::text NOT NULL,
    attachment_name text,
    attachment_url text,
    created_by integer,
    created_by_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.entity_notes OWNER TO postgres;

--
-- Name: entity_notes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.entity_notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.entity_notes_id_seq OWNER TO postgres;

--
-- Name: entity_notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.entity_notes_id_seq OWNED BY public.entity_notes.id;


--
-- Name: lead_contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_contacts (
    id integer NOT NULL,
    lead_id integer NOT NULL,
    contact_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lead_contacts OWNER TO postgres;

--
-- Name: lead_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_contacts_id_seq OWNER TO postgres;

--
-- Name: lead_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_contacts_id_seq OWNED BY public.lead_contacts.id;


--
-- Name: lead_insights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_insights (
    id integer NOT NULL,
    lead_id integer NOT NULL,
    company_size text,
    industry_segment text,
    product_summary text,
    recent_news text,
    hiring_trend text,
    tech_stack text,
    social_presence text,
    sentiment text,
    growth_indicators text[],
    buying_intent_signals text[],
    ai_score_boost integer DEFAULT 0 NOT NULL,
    buyer_classification text DEFAULT 'medium_potential'::text NOT NULL,
    confidence text DEFAULT 'low'::text NOT NULL,
    raw_insights jsonb,
    analysis_summary text,
    ceo_name text,
    ceo_title text,
    ceo_linkedin text,
    headquarters text,
    founded_year text,
    estimated_market_value text,
    funding_stage text,
    key_competitors text[],
    recent_achievements text[],
    linkedin_url text,
    twitter_handle text,
    facebook_url text,
    instagram_handle text,
    youtube_url text,
    best_contact_name text,
    best_contact_title text,
    best_contact_email text,
    email_pattern text,
    blog_url text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lead_insights OWNER TO postgres;

--
-- Name: lead_insights_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_insights_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_insights_id_seq OWNER TO postgres;

--
-- Name: lead_insights_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_insights_id_seq OWNED BY public.lead_insights.id;


--
-- Name: lead_score_milestones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_score_milestones (
    id integer NOT NULL,
    label text NOT NULL,
    min_score integer NOT NULL,
    max_score integer NOT NULL,
    color text DEFAULT 'gray'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lead_score_milestones OWNER TO postgres;

--
-- Name: lead_score_milestones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_score_milestones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_score_milestones_id_seq OWNER TO postgres;

--
-- Name: lead_score_milestones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_score_milestones_id_seq OWNED BY public.lead_score_milestones.id;


--
-- Name: lead_scoring_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lead_scoring_rules (
    id integer NOT NULL,
    rule_type text NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    description text,
    points integer DEFAULT 0 NOT NULL,
    params jsonb,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.lead_scoring_rules OWNER TO postgres;

--
-- Name: lead_scoring_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lead_scoring_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lead_scoring_rules_id_seq OWNER TO postgres;

--
-- Name: lead_scoring_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lead_scoring_rules_id_seq OWNED BY public.lead_scoring_rules.id;


--
-- Name: leads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leads (
    id integer NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    website text,
    company text,
    title text,
    status text DEFAULT 'new'::text NOT NULL,
    source text,
    score integer,
    annual_revenue numeric(15,2),
    employees integer,
    industry text,
    description text,
    assigned_to integer,
    is_converted boolean DEFAULT false NOT NULL,
    converted_contact_id integer,
    converted_account_id integer,
    converted_opportunity_id integer,
    buyer_classification text,
    insights_generated_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.leads OWNER TO postgres;

--
-- Name: leads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leads_id_seq OWNER TO postgres;

--
-- Name: leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leads_id_seq OWNED BY public.leads.id;


--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opportunities (
    id integer NOT NULL,
    name text NOT NULL,
    account_id integer,
    contact_id integer,
    stage text DEFAULT 'prospecting'::text NOT NULL,
    amount numeric(15,2),
    probability integer,
    close_date timestamp without time zone,
    description text,
    assigned_to integer,
    lead_source text,
    next_step text,
    forecast_category text,
    team_members text,
    price_book_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.opportunities OWNER TO postgres;

--
-- Name: opportunities_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.opportunities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.opportunities_id_seq OWNER TO postgres;

--
-- Name: opportunities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.opportunities_id_seq OWNED BY public.opportunities.id;


--
-- Name: opportunity_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opportunity_items (
    id integer NOT NULL,
    opportunity_id integer NOT NULL,
    product_id integer,
    price_book_entry_id integer,
    product_name text NOT NULL,
    quantity numeric(15,2) DEFAULT '1'::numeric NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    discount numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.opportunity_items OWNER TO postgres;

--
-- Name: opportunity_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.opportunity_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.opportunity_items_id_seq OWNER TO postgres;

--
-- Name: opportunity_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.opportunity_items_id_seq OWNED BY public.opportunity_items.id;


--
-- Name: opportunity_stage_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.opportunity_stage_history (
    id integer NOT NULL,
    opportunity_id integer NOT NULL,
    stage text NOT NULL,
    entered_at timestamp without time zone DEFAULT now() NOT NULL,
    left_at timestamp without time zone
);


ALTER TABLE public.opportunity_stage_history OWNER TO postgres;

--
-- Name: opportunity_stage_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.opportunity_stage_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.opportunity_stage_history_id_seq OWNER TO postgres;

--
-- Name: opportunity_stage_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.opportunity_stage_history_id_seq OWNED BY public.opportunity_stage_history.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    product_id integer,
    product_name text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    discount numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    order_number text NOT NULL,
    quote_id integer,
    opportunity_id integer,
    contact_id integer,
    account_id integer,
    created_by_user_id integer,
    status text DEFAULT 'pending'::text NOT NULL,
    subtotal numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    tax numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    order_date timestamp without time zone DEFAULT now() NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: price_book_entries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_book_entries (
    id integer NOT NULL,
    price_book_id integer NOT NULL,
    product_id integer NOT NULL,
    list_price numeric(15,2) NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    use_standard_price boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.price_book_entries OWNER TO postgres;

--
-- Name: price_book_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.price_book_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.price_book_entries_id_seq OWNER TO postgres;

--
-- Name: price_book_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.price_book_entries_id_seq OWNED BY public.price_book_entries.id;


--
-- Name: price_books; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.price_books (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    is_standard boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.price_books OWNER TO postgres;

--
-- Name: price_books_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.price_books_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.price_books_id_seq OWNER TO postgres;

--
-- Name: price_books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.price_books_id_seq OWNED BY public.price_books.id;


--
-- Name: product_bundle_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_bundle_items (
    id integer NOT NULL,
    bundle_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    unit_price_override numeric,
    discount_pct numeric DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_bundle_items OWNER TO postgres;

--
-- Name: product_bundle_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_bundle_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_bundle_items_id_seq OWNER TO postgres;

--
-- Name: product_bundle_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_bundle_items_id_seq OWNED BY public.product_bundle_items.id;


--
-- Name: product_bundles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_bundles (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    bundle_discount_pct numeric DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_bundles OWNER TO postgres;

--
-- Name: product_bundles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_bundles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_bundles_id_seq OWNER TO postgres;

--
-- Name: product_bundles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_bundles_id_seq OWNED BY public.product_bundles.id;


--
-- Name: product_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_rules (
    id integer NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    scope text DEFAULT 'Product'::text NOT NULL,
    conditions_met text DEFAULT 'All'::text NOT NULL,
    conditions text DEFAULT '[]'::text NOT NULL,
    actions text DEFAULT '[]'::text NOT NULL,
    error_message text,
    active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_rules OWNER TO postgres;

--
-- Name: product_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_rules_id_seq OWNER TO postgres;

--
-- Name: product_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_rules_id_seq OWNED BY public.product_rules.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name text NOT NULL,
    code text,
    description text,
    unit_price numeric(15,2) NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    category text,
    quantity_unit_of_measure text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.products OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quote_items (
    id integer NOT NULL,
    quote_id integer NOT NULL,
    product_id integer,
    price_book_entry_id integer,
    product_name text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    discount numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quote_items OWNER TO postgres;

--
-- Name: quote_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quote_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quote_items_id_seq OWNER TO postgres;

--
-- Name: quote_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quote_items_id_seq OWNED BY public.quote_items.id;


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quotes (
    id integer NOT NULL,
    quote_number text NOT NULL,
    name text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    parent_quote_id integer,
    cloned_from_quote_id integer,
    created_by_user_id integer,
    created_by_name text,
    created_by_email text,
    opportunity_id integer,
    contact_id integer,
    account_id integer,
    price_book_id integer,
    status text DEFAULT 'draft'::text NOT NULL,
    valid_until timestamp without time zone,
    subtotal numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    discount numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    tax numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    total numeric(15,2) DEFAULT '0'::numeric NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.quotes OWNER TO postgres;

--
-- Name: quotes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quotes_id_seq OWNER TO postgres;

--
-- Name: quotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quotes_id_seq OWNED BY public.quotes.id;


--
-- Name: record_access; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.record_access (
    id integer NOT NULL,
    record_type_key text NOT NULL,
    role_key text NOT NULL,
    can_view boolean DEFAULT false NOT NULL,
    can_read_only boolean DEFAULT false NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    updated_by integer,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.record_access OWNER TO postgres;

--
-- Name: record_access_audit_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.record_access_audit_log (
    id integer NOT NULL,
    record_type_key text NOT NULL,
    role_key text NOT NULL,
    previous_permissions jsonb,
    new_permissions jsonb NOT NULL,
    changed_by_user_id integer,
    changed_by_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.record_access_audit_log OWNER TO postgres;

--
-- Name: record_access_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.record_access_audit_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.record_access_audit_log_id_seq OWNER TO postgres;

--
-- Name: record_access_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.record_access_audit_log_id_seq OWNED BY public.record_access_audit_log.id;


--
-- Name: record_access_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.record_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.record_access_id_seq OWNER TO postgres;

--
-- Name: record_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.record_access_id_seq OWNED BY public.record_access.id;


--
-- Name: record_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.record_types (
    key text NOT NULL,
    name text NOT NULL,
    sort_order integer DEFAULT 100 NOT NULL
);


ALTER TABLE public.record_types OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    key text NOT NULL,
    label text NOT NULL,
    sort_order integer DEFAULT 100 NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: screen_access; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.screen_access (
    id integer NOT NULL,
    screen_key text NOT NULL,
    role_key text NOT NULL,
    access_level text DEFAULT 'none'::text NOT NULL,
    updated_by integer,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.screen_access OWNER TO postgres;

--
-- Name: screen_access_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.screen_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.screen_access_id_seq OWNER TO postgres;

--
-- Name: screen_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.screen_access_id_seq OWNED BY public.screen_access.id;


--
-- Name: screens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.screens (
    key text NOT NULL,
    name text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    sort_order integer DEFAULT 100 NOT NULL
);


ALTER TABLE public.screens OWNER TO postgres;

--
-- Name: stims_attainment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stims_attainment (
    id integer NOT NULL,
    user_id integer NOT NULL,
    fiscal_period_id integer,
    actual_amount numeric DEFAULT 0 NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stims_attainment OWNER TO postgres;

--
-- Name: stims_attainment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stims_attainment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stims_attainment_id_seq OWNER TO postgres;

--
-- Name: stims_attainment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stims_attainment_id_seq OWNED BY public.stims_attainment.id;


--
-- Name: stims_calc_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stims_calc_runs (
    id integer NOT NULL,
    fiscal_period_id integer,
    cycle_id integer,
    status text DEFAULT 'draft'::text NOT NULL,
    total_payout numeric DEFAULT 0,
    approved_by integer,
    run_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stims_calc_runs OWNER TO postgres;

--
-- Name: stims_calc_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stims_calc_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stims_calc_runs_id_seq OWNER TO postgres;

--
-- Name: stims_calc_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stims_calc_runs_id_seq OWNED BY public.stims_calc_runs.id;


--
-- Name: stims_disputes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stims_disputes (
    id integer NOT NULL,
    payout_line_id integer,
    user_id integer NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    resolution text,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stims_disputes OWNER TO postgres;

--
-- Name: stims_disputes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stims_disputes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stims_disputes_id_seq OWNER TO postgres;

--
-- Name: stims_disputes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stims_disputes_id_seq OWNED BY public.stims_disputes.id;


--
-- Name: stims_fiscal_periods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stims_fiscal_periods (
    id integer NOT NULL,
    name text NOT NULL,
    fiscal_year integer NOT NULL,
    period_type text DEFAULT 'monthly'::text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stims_fiscal_periods OWNER TO postgres;

--
-- Name: stims_fiscal_periods_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stims_fiscal_periods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stims_fiscal_periods_id_seq OWNER TO postgres;

--
-- Name: stims_fiscal_periods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stims_fiscal_periods_id_seq OWNED BY public.stims_fiscal_periods.id;


--
-- Name: stims_incentive_plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stims_incentive_plans (
    id integer NOT NULL,
    name text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    effective_start date,
    effective_end date,
    currency text DEFAULT 'GBP'::text NOT NULL,
    base_variable_split numeric DEFAULT 30 NOT NULL,
    ote_amount numeric DEFAULT 0 NOT NULL,
    payout_frequency text DEFAULT 'quarterly'::text NOT NULL,
    threshold_pct numeric DEFAULT 70 NOT NULL,
    cap_pct numeric,
    measure text DEFAULT 'revenue'::text NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stims_incentive_plans OWNER TO postgres;

--
-- Name: stims_incentive_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stims_incentive_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stims_incentive_plans_id_seq OWNER TO postgres;

--
-- Name: stims_incentive_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stims_incentive_plans_id_seq OWNED BY public.stims_incentive_plans.id;


--
-- Name: stims_payout_lines; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stims_payout_lines (
    id integer NOT NULL,
    run_id integer NOT NULL,
    user_id integer NOT NULL,
    quota numeric DEFAULT 0 NOT NULL,
    actual numeric DEFAULT 0 NOT NULL,
    attainment_pct numeric DEFAULT 0 NOT NULL,
    gross_payout numeric DEFAULT 0 NOT NULL,
    adjustment numeric DEFAULT 0,
    adjustment_reason text,
    net_payout numeric DEFAULT 0 NOT NULL,
    breakdown text,
    exception_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stims_payout_lines OWNER TO postgres;

--
-- Name: stims_payout_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stims_payout_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stims_payout_lines_id_seq OWNER TO postgres;

--
-- Name: stims_payout_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stims_payout_lines_id_seq OWNED BY public.stims_payout_lines.id;


--
-- Name: stims_plan_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stims_plan_assignments (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    user_id integer NOT NULL,
    effective_start date,
    effective_end date,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stims_plan_assignments OWNER TO postgres;

--
-- Name: stims_plan_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stims_plan_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stims_plan_assignments_id_seq OWNER TO postgres;

--
-- Name: stims_plan_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stims_plan_assignments_id_seq OWNED BY public.stims_plan_assignments.id;


--
-- Name: stims_plan_tiers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stims_plan_tiers (
    id integer NOT NULL,
    plan_id integer NOT NULL,
    label text,
    from_pct numeric NOT NULL,
    to_pct numeric,
    rate_pct numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stims_plan_tiers OWNER TO postgres;

--
-- Name: stims_plan_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stims_plan_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stims_plan_tiers_id_seq OWNER TO postgres;

--
-- Name: stims_plan_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stims_plan_tiers_id_seq OWNED BY public.stims_plan_tiers.id;


--
-- Name: stims_quotas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stims_quotas (
    id integer NOT NULL,
    cycle_id integer NOT NULL,
    user_id integer NOT NULL,
    quota_amount numeric DEFAULT 0 NOT NULL,
    ramp_pct numeric DEFAULT 100 NOT NULL,
    is_new_hire boolean DEFAULT false NOT NULL,
    period_breakdowns jsonb,
    approved boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stims_quotas OWNER TO postgres;

--
-- Name: stims_quotas_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stims_quotas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stims_quotas_id_seq OWNER TO postgres;

--
-- Name: stims_quotas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stims_quotas_id_seq OWNED BY public.stims_quotas.id;


--
-- Name: stims_ramp_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stims_ramp_templates (
    id integer NOT NULL,
    name text NOT NULL,
    months_schedule jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stims_ramp_templates OWNER TO postgres;

--
-- Name: stims_ramp_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stims_ramp_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stims_ramp_templates_id_seq OWNER TO postgres;

--
-- Name: stims_ramp_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stims_ramp_templates_id_seq OWNED BY public.stims_ramp_templates.id;


--
-- Name: stims_target_cycles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stims_target_cycles (
    id integer NOT NULL,
    name text NOT NULL,
    fiscal_period_id integer,
    metric text DEFAULT 'revenue'::text NOT NULL,
    total_target numeric DEFAULT 0 NOT NULL,
    allocation_method text DEFAULT 'equal'::text NOT NULL,
    scope text DEFAULT 'All'::text NOT NULL,
    currency text DEFAULT 'GBP'::text NOT NULL,
    growth_pct numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.stims_target_cycles OWNER TO postgres;

--
-- Name: stims_target_cycles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stims_target_cycles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.stims_target_cycles_id_seq OWNER TO postgres;

--
-- Name: stims_target_cycles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stims_target_cycles_id_seq OWNED BY public.stims_target_cycles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'rep'::text NOT NULL,
    team text,
    avatar_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: website_visits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.website_visits (
    id integer NOT NULL,
    session_id text,
    path text,
    referrer text,
    user_agent text,
    ip_address text,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    campaign_id integer,
    visited_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.website_visits OWNER TO postgres;

--
-- Name: website_visits_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.website_visits_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.website_visits_id_seq OWNER TO postgres;

--
-- Name: website_visits_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.website_visits_id_seq OWNED BY public.website_visits.id;


--
-- Name: access_audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_audit_log ALTER COLUMN id SET DEFAULT nextval('public.access_audit_log_id_seq'::regclass);


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: activities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities ALTER COLUMN id SET DEFAULT nextval('public.activities_id_seq'::regclass);


--
-- Name: allowed_users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allowed_users ALTER COLUMN id SET DEFAULT nextval('public.allowed_users_id_seq'::regclass);


--
-- Name: approval_audit_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_audit_events ALTER COLUMN id SET DEFAULT nextval('public.approval_audit_events_id_seq'::regclass);


--
-- Name: approval_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_configs ALTER COLUMN id SET DEFAULT nextval('public.approval_configs_id_seq'::regclass);


--
-- Name: approval_criteria id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_criteria ALTER COLUMN id SET DEFAULT nextval('public.approval_criteria_id_seq'::regclass);


--
-- Name: approval_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests ALTER COLUMN id SET DEFAULT nextval('public.approval_requests_id_seq'::regclass);


--
-- Name: approval_roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_roles ALTER COLUMN id SET DEFAULT nextval('public.approval_roles_id_seq'::regclass);


--
-- Name: campaign_engagements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_engagements ALTER COLUMN id SET DEFAULT nextval('public.campaign_engagements_id_seq'::regclass);


--
-- Name: campaign_members id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_members ALTER COLUMN id SET DEFAULT nextval('public.campaign_members_id_seq'::regclass);


--
-- Name: campaigns id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns ALTER COLUMN id SET DEFAULT nextval('public.campaigns_id_seq'::regclass);


--
-- Name: cases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases ALTER COLUMN id SET DEFAULT nextval('public.cases_id_seq'::regclass);


--
-- Name: clm_notification_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clm_notification_rules ALTER COLUMN id SET DEFAULT nextval('public.clm_notification_rules_id_seq'::regclass);


--
-- Name: clm_redlines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clm_redlines ALTER COLUMN id SET DEFAULT nextval('public.clm_redlines_id_seq'::regclass);


--
-- Name: clm_reviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clm_reviews ALTER COLUMN id SET DEFAULT nextval('public.clm_reviews_id_seq'::regclass);


--
-- Name: clm_signers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clm_signers ALTER COLUMN id SET DEFAULT nextval('public.clm_signers_id_seq'::regclass);


--
-- Name: clm_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clm_templates ALTER COLUMN id SET DEFAULT nextval('public.clm_templates_id_seq'::regclass);


--
-- Name: clm_workflow_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clm_workflow_rules ALTER COLUMN id SET DEFAULT nextval('public.clm_workflow_rules_id_seq'::regclass);


--
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- Name: contract_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_documents ALTER COLUMN id SET DEFAULT nextval('public.contract_documents_id_seq'::regclass);


--
-- Name: contract_line_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_line_items ALTER COLUMN id SET DEFAULT nextval('public.contract_line_items_id_seq'::regclass);


--
-- Name: contracts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts ALTER COLUMN id SET DEFAULT nextval('public.contracts_id_seq'::regclass);


--
-- Name: email_attachments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_attachments ALTER COLUMN id SET DEFAULT nextval('public.email_attachments_id_seq'::regclass);


--
-- Name: email_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_settings ALTER COLUMN id SET DEFAULT nextval('public.email_settings_id_seq'::regclass);


--
-- Name: email_tracking id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_tracking ALTER COLUMN id SET DEFAULT nextval('public.email_tracking_id_seq'::regclass);


--
-- Name: emails id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emails ALTER COLUMN id SET DEFAULT nextval('public.emails_id_seq'::regclass);


--
-- Name: enquiries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enquiries ALTER COLUMN id SET DEFAULT nextval('public.enquiries_id_seq'::regclass);


--
-- Name: entity_notes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_notes ALTER COLUMN id SET DEFAULT nextval('public.entity_notes_id_seq'::regclass);


--
-- Name: lead_contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_contacts ALTER COLUMN id SET DEFAULT nextval('public.lead_contacts_id_seq'::regclass);


--
-- Name: lead_insights id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_insights ALTER COLUMN id SET DEFAULT nextval('public.lead_insights_id_seq'::regclass);


--
-- Name: lead_score_milestones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_score_milestones ALTER COLUMN id SET DEFAULT nextval('public.lead_score_milestones_id_seq'::regclass);


--
-- Name: lead_scoring_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_scoring_rules ALTER COLUMN id SET DEFAULT nextval('public.lead_scoring_rules_id_seq'::regclass);


--
-- Name: leads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads ALTER COLUMN id SET DEFAULT nextval('public.leads_id_seq'::regclass);


--
-- Name: opportunities id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunities ALTER COLUMN id SET DEFAULT nextval('public.opportunities_id_seq'::regclass);


--
-- Name: opportunity_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_items ALTER COLUMN id SET DEFAULT nextval('public.opportunity_items_id_seq'::regclass);


--
-- Name: opportunity_stage_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_stage_history ALTER COLUMN id SET DEFAULT nextval('public.opportunity_stage_history_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: price_book_entries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_book_entries ALTER COLUMN id SET DEFAULT nextval('public.price_book_entries_id_seq'::regclass);


--
-- Name: price_books id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_books ALTER COLUMN id SET DEFAULT nextval('public.price_books_id_seq'::regclass);


--
-- Name: product_bundle_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_bundle_items ALTER COLUMN id SET DEFAULT nextval('public.product_bundle_items_id_seq'::regclass);


--
-- Name: product_bundles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_bundles ALTER COLUMN id SET DEFAULT nextval('public.product_bundles_id_seq'::regclass);


--
-- Name: product_rules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_rules ALTER COLUMN id SET DEFAULT nextval('public.product_rules_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: quote_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items ALTER COLUMN id SET DEFAULT nextval('public.quote_items_id_seq'::regclass);


--
-- Name: quotes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes ALTER COLUMN id SET DEFAULT nextval('public.quotes_id_seq'::regclass);


--
-- Name: record_access id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_access ALTER COLUMN id SET DEFAULT nextval('public.record_access_id_seq'::regclass);


--
-- Name: record_access_audit_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_access_audit_log ALTER COLUMN id SET DEFAULT nextval('public.record_access_audit_log_id_seq'::regclass);


--
-- Name: screen_access id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screen_access ALTER COLUMN id SET DEFAULT nextval('public.screen_access_id_seq'::regclass);


--
-- Name: stims_attainment id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_attainment ALTER COLUMN id SET DEFAULT nextval('public.stims_attainment_id_seq'::regclass);


--
-- Name: stims_calc_runs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_calc_runs ALTER COLUMN id SET DEFAULT nextval('public.stims_calc_runs_id_seq'::regclass);


--
-- Name: stims_disputes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_disputes ALTER COLUMN id SET DEFAULT nextval('public.stims_disputes_id_seq'::regclass);


--
-- Name: stims_fiscal_periods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_fiscal_periods ALTER COLUMN id SET DEFAULT nextval('public.stims_fiscal_periods_id_seq'::regclass);


--
-- Name: stims_incentive_plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_incentive_plans ALTER COLUMN id SET DEFAULT nextval('public.stims_incentive_plans_id_seq'::regclass);


--
-- Name: stims_payout_lines id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_payout_lines ALTER COLUMN id SET DEFAULT nextval('public.stims_payout_lines_id_seq'::regclass);


--
-- Name: stims_plan_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_plan_assignments ALTER COLUMN id SET DEFAULT nextval('public.stims_plan_assignments_id_seq'::regclass);


--
-- Name: stims_plan_tiers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_plan_tiers ALTER COLUMN id SET DEFAULT nextval('public.stims_plan_tiers_id_seq'::regclass);


--
-- Name: stims_quotas id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_quotas ALTER COLUMN id SET DEFAULT nextval('public.stims_quotas_id_seq'::regclass);


--
-- Name: stims_ramp_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_ramp_templates ALTER COLUMN id SET DEFAULT nextval('public.stims_ramp_templates_id_seq'::regclass);


--
-- Name: stims_target_cycles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_target_cycles ALTER COLUMN id SET DEFAULT nextval('public.stims_target_cycles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: website_visits id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.website_visits ALTER COLUMN id SET DEFAULT nextval('public.website_visits_id_seq'::regclass);


--
-- Data for Name: access_audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.access_audit_log (id, screen_key, role_key, previous_level, new_level, changed_by_user_id, changed_by_name, created_at) FROM stdin;
1	access-control	md	none	edit	0	Dev Admin	2026-07-04 12:50:27.467353
2	access-control	vp	none	edit	0	Dev Admin	2026-07-04 12:50:27.969679
3	access-control	sales_director	none	edit	0	Dev Admin	2026-07-04 12:50:28.564439
4	access-control	sales_manager	none	edit	0	Dev Admin	2026-07-04 12:50:29.161097
5	access-control	md	edit	none	0	Dev Admin	2026-07-04 12:50:36.530737
6	access-control	vp	edit	none	0	Dev Admin	2026-07-04 12:50:37.173949
7	access-control	sales_director	edit	none	0	Dev Admin	2026-07-04 12:50:37.846709
8	access-control	sales_manager	edit	none	0	Dev Admin	2026-07-04 12:50:38.188154
9	approvals	md	none	edit	0	Dev Admin	2026-07-04 12:51:06.032609
10	approvals	vp	none	edit	0	Dev Admin	2026-07-04 12:51:06.363186
11	approvals	sales_director	none	edit	0	Dev Admin	2026-07-04 12:51:07.386794
12	approvals	sales_manager	none	edit	0	Dev Admin	2026-07-04 12:51:08.694138
13	approvals	sales_rep	none	edit	0	Dev Admin	2026-07-04 12:51:09.298282
14	cases	sales_rep	edit	none	0	Dev Admin	2026-07-04 12:51:20.67026
15	cases	sales_rep	none	view	0	Dev Admin	2026-07-04 12:51:22.314631
16	access-control	md	none	edit	0	Dev Admin	2026-07-04 12:51:31.341779
\.


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.accounts (id, name, industry, website, phone, email, address, city, country, employees, annual_revenue, description, status, stage, amount, close_date, probability, forecast_category, next_step, opty_owner, opty_team, clm_enabled, owner_id, created_by, modified_by, created_at, updated_at) FROM stdin;
1	Apex Technologies Pvt Ltd	Technology	https://apextech.in	+91-80-4567-8900	info@apextech.in	\N	Bengaluru	India	320	4200000.00	Enterprise software solutions provider focused on BFSI and logistics verticals.	active	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-28 14:00:47.56368	2026-06-28 14:00:47.56368
2	Meridian Healthcare Group	Healthcare	https://meridianhc.com	+91-22-2345-6789	contact@meridianhc.com	\N	Mumbai	India	1800	28000000.00	Multi-speciality hospital chain with 12 facilities across Maharashtra and Goa.	active	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-28 14:00:47.56368	2026-06-28 14:00:47.56368
3	GreenLeaf Agritech	Agriculture	https://greenleaf.ag	+91-40-9876-5432	hello@greenleaf.ag	\N	Hyderabad	India	95	1100000.00	AgriTech startup connecting farmers with direct market access using IoT sensors.	active	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-28 14:00:47.56368	2026-06-28 14:00:47.56368
4	Starfield Retail Solutions	Retail	https://starfieldretail.com	+91-44-7654-3210	sales@starfieldretail.com	\N	Chennai	India	540	9600000.00	Omnichannel retail operations and inventory management for mid-market chains.	active	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-28 14:00:47.56368	2026-06-28 14:00:47.56368
5	BlueSky Finserv	Financial Services	https://blueskyfs.com	+91-11-6543-2109	bd@blueskyfs.com	\N	New Delhi	India	210	6500000.00	NBFC offering MSME working capital loans and supply chain financing.	active	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-28 14:00:47.56368	2026-06-28 14:00:47.56368
6	Catalyst EduTech	Education	https://catalystedu.in	+91-80-1122-3344	partnerships@catalystedu.in	\N	Bengaluru	India	78	830000.00	EdTech platform for upskilling professionals in data, cloud and DevOps domains.	active	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-28 14:00:47.56368	2026-06-28 14:00:47.56368
8	AutoTest Account CI 2	Technology	\N	\N	\N	\N	\N	\N	\N	\N	\N	Active	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	\N	2026-06-28 14:00:54.645473	2026-06-28 14:00:54.645473
\.


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activities (id, type, subject, description, status, due_date, completed_at, lead_id, contact_id, opportunity_id, account_id, assigned_to, created_at, updated_at) FROM stdin;
1	call	Discovery call with Apex Technologies	Introductory call with Rajesh. Confirmed 320-seat requirement. Asked about ERP integration.	completed	2026-06-14 13:00:47.585	2026-06-14 13:00:47.585	\N	1	1	1	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
2	email	Proposal sent – Apex Enterprise CRM	Sent detailed commercial proposal with pricing tiers and implementation timeline.	completed	2026-06-21 13:00:47.585	2026-06-21 13:00:47.585	\N	1	1	1	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
3	meeting	Exec alignment – Meridian Healthcare pilot	Met with Dr. Ananya and legal team. HIPAA clause concerns raised and addressed.	completed	2026-06-23 13:00:47.585	2026-06-23 13:00:47.585	\N	3	2	2	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
4	task	Prepare ROI model for Catalyst EduTech	Build spreadsheet ROI model comparing current manual process cost vs CRM.	planned	2026-07-01 13:00:47.585	\N	\N	11	6	6	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
5	call	Follow-up on commercial terms – Meridian	Vikram to confirm procurement approval. Check if CFO sign-off is done.	planned	2026-06-30 13:00:47.585	\N	\N	4	2	2	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
6	meeting	Technical demo – BlueSky Finserv	Show custom workflow builder and compliance dashboard to their dev team.	planned	2026-07-03 13:00:47.585	\N	\N	8	4	5	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
7	email	AI Insights benchmark report – Apex	Sent PDF with lead scoring accuracy benchmarks and competitor comparison.	completed	2026-06-26 13:00:47.585	2026-06-26 13:00:47.585	\N	12	8	1	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
8	task	Kickoff data migration – Starfield Retail	Coordinate with Starfield IT to export legacy CRM data in CSV format.	planned	2026-06-29 13:00:47.585	\N	\N	6	3	4	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
9	call	Qualifying call – GreenLeaf Agritech	Understand Kavitha's budget range and timeline. WhatsApp integration is key.	planned	2026-07-05 13:00:47.585	\N	\N	5	5	3	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
10	meeting	Onboarding session #1 – Starfield Retail	Completed first onboarding session with Meena and her ops team. 12 users set up.	completed	2026-06-27 13:00:47.585	2026-06-27 13:00:47.585	\N	7	3	4	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
11	task	Update NDA – Apex Technologies	Redlined NDA with Priya's legal team. Signed copy received.	completed	2026-06-18 13:00:47.585	2026-06-19 13:00:47.585	\N	2	1	1	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
12	call	CEO check-in – Catalyst EduTech	Rahul is excited about partnership CRM. Budget approved in Q2 planning.	completed	2026-06-25 13:00:47.585	2026-06-25 13:00:47.585	\N	10	6	6	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
13	email	Feature request log – Meridian Healthcare	Documented 8 custom feature requests from pilot planning session with Dr. Ananya.	completed	2026-06-22 13:00:47.585	2026-06-22 13:00:47.585	\N	3	7	2	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
14	task	Prepare contract draft – BlueSky Finserv	Draft SaaS subscription agreement with Pooja's compliance team annotations.	planned	2026-07-08 13:00:47.585	\N	\N	9	4	5	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
15	meeting	Quarterly business review – Apex Technologies	Full QBR with Rajesh and Karthik to review expansion roadmap.	planned	2026-07-13 13:00:47.585	\N	\N	1	1	1	\N	2026-06-28 14:00:47.590439	2026-06-28 14:00:47.590439
\.


--
-- Data for Name: allowed_users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.allowed_users (id, email, name, role, google_id, avatar_url, added_by_email, is_active, last_login_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: app_modules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_modules (key, label, description, is_enabled, is_core, sort_order, updated_at) FROM stdin;
crm_sales	CRM Sales	Core CRM features: Leads, Contacts, Accounts, Opportunities, Activities, Campaigns, Reports and AI Assistant. Always active.	t	t	10	2026-06-28 13:56:17.092673
quotes	Quote Management	Create, configure and send pricing quotes. Includes approval workflows and PDF generation.	t	f	20	2026-06-28 13:56:17.092673
orders	Order Management	Track customer orders from placement to fulfilment. Syncs with Quotes and Opportunities.	t	f	30	2026-06-28 13:56:17.092673
contracts	Contract Management	Full contract lifecycle management — Draft, Under Review, Active, Expired and Terminated. Enabling this module activates the complete lifecycle workflow.	t	f	40	2026-06-28 13:56:17.092673
\.


--
-- Data for Name: approval_audit_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_audit_events (id, request_id, event, actor_user_id, actor_name, comment, created_at) FROM stdin;
\.


--
-- Data for Name: approval_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_configs (id, entity, multi_level, enabled, created_at, updated_at) FROM stdin;
1	account	f	t	2026-07-04 12:51:41.881442	2026-07-04 12:51:41.881442
2	opportunity	t	t	2026-07-04 12:51:41.884863	2026-07-04 12:51:41.884863
3	quote	f	t	2026-07-04 12:51:41.887953	2026-07-04 12:51:41.887953
4	order	f	t	2026-07-04 12:51:41.891655	2026-07-04 12:51:41.891655
\.


--
-- Data for Name: approval_criteria; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_criteria (id, entity, name, field, operator, threshold, threshold_text, level, role_id, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: approval_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_requests (id, entity, entity_id, status, level, role_id, criterion_id, rule_key, requested_by, requested_at, decided_by, decided_at, comment, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: approval_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.approval_roles (id, name, level, description, created_at, updated_at) FROM stdin;
1	Sales_Manager	1	First-line sales approver	2026-07-04 12:51:41.871418	2026-07-04 12:51:41.871418
2	Sales_Director	2	Mid-level sales approver	2026-07-04 12:51:41.871418	2026-07-04 12:51:41.871418
3	VP_Sales	3	Executive sales approver	2026-07-04 12:51:41.871418	2026-07-04 12:51:41.871418
4	Finance_Manager	1	Finance first-line approver	2026-07-04 12:51:41.871418	2026-07-04 12:51:41.871418
5	Finance_Controller	2	Finance escalation approver	2026-07-04 12:51:41.871418	2026-07-04 12:51:41.871418
6	Senior_Account_Director	2	High-value account approver	2026-07-04 12:51:41.871418	2026-07-04 12:51:41.871418
7	Pricing_Team	1	Pricing review	2026-07-04 12:51:41.871418	2026-07-04 12:51:41.871418
8	Operations_Manager	1	Operations approval	2026-07-04 12:51:41.871418	2026-07-04 12:51:41.871418
9	Logistics_Lead	1	Logistics approval	2026-07-04 12:51:41.871418	2026-07-04 12:51:41.871418
\.


--
-- Data for Name: campaign_engagements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.campaign_engagements (id, campaign_id, platform, event_type, engagement_score, interest_category, lead_id, contact_id, platform_user_id, platform_user_name, platform_user_email, platform_user_phone, anonymous_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, metadata, raw_payload, occurred_at, created_at) FROM stdin;
\.


--
-- Data for Name: campaign_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.campaign_members (id, campaign_id, contact_id, lead_id, first_name, last_name, email, company_name, role, status, sent_at, opened_at, clicked_at, bounced_at, unsubscribed_at, source, added_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: campaigns; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.campaigns (id, name, type, status, start_date, end_date, budget, actual_cost, expected_revenue, description, target_audience, channels, team_members, goals, launched_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.cases (id, case_number, subject, description, status, priority, type, origin, contact_id, account_id, assigned_to, resolution, resolved_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: clm_notification_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clm_notification_rules (id, name, event, recipients, channels, trigger_days_before, message_template, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: clm_redlines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clm_redlines (id, contract_id, author_id, round, section, original_text, proposed_text, change_type, party, status, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: clm_reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clm_reviews (id, contract_id, reviewer_id, stage, status, decision, due_date, decision_date, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: clm_signers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clm_signers (id, contract_id, name, email, title, role, signing_order, party, status, signed_at, created_at, updated_at) FROM stdin;
1	21	Soundarrajan	parthy777@gmail.com	Miss	approver	1	counterparty	pending	\N	2026-06-28 20:41:15.157581	2026-06-28 20:41:15.157581
\.


--
-- Data for Name: clm_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clm_templates (id, name, category, description, content, variables, active, created_at, updated_at) FROM stdin;
1	standard SoW V1	SOW	sow 	This Agreement establishes the terms under which the Service Provider will deliver professional services to the Client. Specific services, deliverables, timelines, and commercial terms will be defined in individual Statements of Work (“SOWs”).	"[]"	t	2026-06-29 12:04:25.547531	2026-06-29 12:04:25.547531
2	Test	MSA	\N	The {{company_name}} agreed to move forward with {{our_company_name}}{{our_company_address}} {{contract_value}}and {{payment_terms}} agreed and signed by both the parties {{contact_title}}{{signatory_name}}	"[\\"company_name\\",\\"effective_date\\",\\"expiry_date\\",\\"company_address\\",\\"contact_title\\",\\"contact_email\\",\\"contact_name\\",\\"our_company_name\\",\\"signatory_name\\",\\"our_company_address\\",\\"signatory_title\\",\\"contract_value\\",\\"payment_terms\\",\\"discount_percent\\",\\"currency\\"]"	t	2026-06-30 16:30:15.414888	2026-06-30 16:30:15.414888
\.


--
-- Data for Name: clm_workflow_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clm_workflow_rules (id, name, trigger_event, conditions, actions, active, sort_order, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contacts (id, first_name, last_name, email, phone, mobile, title, department, account_id, owner_id, lead_source, address, city, country, description, created_at, updated_at) FROM stdin;
1	Rajesh	Iyer	rajesh.iyer@apextech.in	+91-98765-43210	\N	CTO	Technology	1	\N	referral	\N	Bengaluru	India	\N	2026-06-28 14:00:47.569524	2026-06-28 14:00:47.569524
2	Priya	Subramaniam	priya.s@apextech.in	+91-98123-45678	\N	Head of Operations	Operations	1	\N	website	\N	Bengaluru	India	\N	2026-06-28 14:00:47.569524	2026-06-28 14:00:47.569524
3	Ananya	Krishnamurthy	ananya.k@meridianhc.com	+91-98456-78901	\N	Chief Medical Officer	Medical	2	\N	conference	\N	Mumbai	India	\N	2026-06-28 14:00:47.569524	2026-06-28 14:00:47.569524
4	Vikram	Shah	vikram.shah@meridianhc.com	+91-91234-56789	\N	VP Finance	Finance	2	\N	linkedin	\N	Mumbai	India	\N	2026-06-28 14:00:47.569524	2026-06-28 14:00:47.569524
5	Kavitha	Rajan	kavitha@greenleaf.ag	+91-90987-65432	\N	Founder & CEO	Executive	3	\N	inbound	\N	Hyderabad	India	\N	2026-06-28 14:00:47.569524	2026-06-28 14:00:47.569524
6	Suresh	Natarajan	suresh.n@starfieldretail.com	+91-99123-45678	\N	Director of Technology	IT	4	\N	partner	\N	Chennai	India	\N	2026-06-28 14:00:47.569524	2026-06-28 14:00:47.569524
7	Meena	Krishnan	meena.k@starfieldretail.com	+91-88765-43210	\N	COO	Operations	4	\N	referral	\N	Chennai	India	\N	2026-06-28 14:00:47.569524	2026-06-28 14:00:47.569524
8	Arjun	Mehta	arjun.m@blueskyfs.com	+91-98654-32109	\N	Chief Digital Officer	Digital	5	\N	linkedin	\N	New Delhi	India	\N	2026-06-28 14:00:47.569524	2026-06-28 14:00:47.569524
9	Pooja	Verma	pooja.v@blueskyfs.com	+91-87654-32198	\N	VP Product	Product	5	\N	conference	\N	New Delhi	India	\N	2026-06-28 14:00:47.569524	2026-06-28 14:00:47.569524
10	Rahul	Sharma	rahul.s@catalystedu.in	+91-96543-21098	\N	Co-Founder & CEO	Executive	6	\N	inbound	\N	Bengaluru	India	\N	2026-06-28 14:00:47.569524	2026-06-28 14:00:47.569524
11	Nandini	Pillai	nandini.p@catalystedu.in	+91-85432-10987	\N	Head of Partnerships	Business Development	6	\N	referral	\N	Bengaluru	India	\N	2026-06-28 14:00:47.569524	2026-06-28 14:00:47.569524
12	Karthik	Balaji	karthik.b@apextech.in	+91-74321-09876	\N	VP Engineering	Engineering	1	\N	website	\N	Bengaluru	India	\N	2026-06-28 14:00:47.569524	2026-06-28 14:00:47.569524
\.


--
-- Data for Name: contract_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contract_documents (id, contract_id, version, title, content, change_summary, created_by_user_id, created_at, is_active) FROM stdin;
1	22	1	Contract – Apex Technologies – Enterprise CRM Proposal	CONTRACT – APEX TECHNOLOGIES – ENTERPRISE CRM PROPOSAL\n\nContract Reference: CNTR-1003\nDate: 28 June 2026\n\n────────────────────────────────────────────────────────────\n\n1. PARTIES\n\nThis Contract Agreement (the "Agreement") is made between:\n\n  (a) ArborMind (the "Provider"); and\n\n  (b) Apex Technologies Pvt Ltd (the "Customer"), represented by Rajesh Iyer.\n\n2. BACKGROUND\n\n7% volume discount applied. Prices in INR equivalent billed as USD. Net 30 payment terms.\n\n3. TERM\n\nThis Agreement shall remain in effect for a term of commencing ____________________, and ending 15 June 2026.\n\n4. SCOPE & PRICING\n\nThe Provider shall provide the following products and/or services:\n\nProduct / Service                            Qty      Unit Price          Amount\n--------------------------------------------------------------------------------\nCRM Pro License                               72       £1,200.00      £86,400.00\nImplementation & Onboarding                    1       £4,500.00       £4,500.00\nCustom Integration Package                     1       £8,000.00       £8,000.00\nPriority Support (Annual)                      1       £2,400.00       £2,400.00\nAI Insights Add-on                            72         £600.00      £43,200.00\n\nTotal Contract Value: £144,500.00\n\n5. SIGNATURES\n\nSigned for and on behalf of the Provider:\n\n  Name:  ____________________\n  Signature:  ____________________        Date:  ____________________\n\nSigned for and on behalf of the Customer:\n\n  Name:  Rajesh Iyer\n  Signature:  ____________________        Date:  ____________________\n	Generated from contract data	\N	2026-06-28 20:47:28.905794	f
2	22	2	Contract – Apex Technologies – Enterprise CRM Proposal	CONTRACT – APEX TECHNOLOGIES – ENTERPRISE CRM PROPOSAL\n\nContract Reference: CNTR-1003\nDate: 28 June 2026\n\n────────────────────────────────────────────────────────────\n\n1. PARTIES\n\nThis Contract Agreement (the "Agreement") is made between:\n\n  (a) ArborMind (the "Provider"); and\n\n  (b) Apex Technologies Pvt Ltd (the "Customer"), represented by Rajesh Iyer.\n\n2. BACKGROUND\n\n7% volume discount applied. Prices in INR equivalent billed as USD. Net 30 payment terms.\n\n3. TERM\n\nThis Agreement shall remain in effect for a term of commencing ____________________, and ending 15 June 2026.\n\n4. SCOPE & PRICING\n\nThe Provider shall provide the following products and/or services:\n\nProduct / Service                            Qty      Unit Price          Amount\n--------------------------------------------------------------------------------\nCRM Pro License                               72       £1,200.00      £86,400.00\nImplementation & Onboarding                    1       £4,500.00       £4,500.00\nCustom Integration Package                     1       £8,000.00       £8,000.00\nPriority Support (Annual)                      1       £2,400.00       £2,400.00\nAI Insights Add-on                            72         £600.00      £43,200.00\n\nTotal Contract Value: £144,500.00\n\n5. SIGNATURES\n\nSigned for and on behalf of the Provider:\n\n  Name:  ____________________\n  Signature:  ____________________        Date:  ____________________\n\nSigned for and on behalf of the Customer:\n\n  Name:  Rajesh Iyer\n  Signature:  ____________________        Date:  ____________________\n	Generated from contract data	\N	2026-06-28 20:51:40.709488	t
3	21	1	Contract – Starfield Retail – Omnichannel CRM (Signed)	CONTRACT – STARFIELD RETAIL – OMNICHANNEL CRM (SIGNED)\n\nContract Reference: CNTR-1002\nDate: 28 June 2026\n\n────────────────────────────────────────────────────────────\n\n1. PARTIES\n\nThis Contract Agreement (the "Agreement") is made between:\n\n  (a) ArborMind (the "Provider"); and\n\n  (b) Starfield Retail Solutions (the "Customer"), represented by Suresh Natarajan.\n\n2. BACKGROUND\n\n5% early-sign discount applied. Includes implementation and first-year support.\n\n3. TERM\n\nThis Agreement shall remain in effect for a term of commencing ____________________, and ending 30 April 2026.\n\n4. SCOPE & PRICING\n\nThe Provider shall provide the following products and/or services:\n\nProduct / Service                            Qty      Unit Price          Amount\n--------------------------------------------------------------------------------\nCRM Pro License                               60       £1,200.00      £72,000.00\nImplementation & Onboarding                    1       £4,500.00       £4,500.00\nData Migration Service                         1       £3,200.00       £3,200.00\nTraining Workshop (1 day)                      2       £1,800.00       £3,600.00\nPriority Support (Annual)                      1       £2,400.00       £2,400.00\n\nTotal Contract Value: £85,700.00\n\n5. SIGNATURES\n\nSigned for and on behalf of the Provider:\n\n  Name:  ____________________\n  Signature:  ____________________        Date:  ____________________\n\nSigned for and on behalf of the Customer:\n\n  Name:  Suresh Natarajan\n  Signature:  ____________________        Date:  ____________________\n	Generated from contract data	\N	2026-06-28 21:02:19.771297	f
4	21	2	Contract – Starfield Retail – Omnichannel CRM (Signed)	════════════════════════════════════════════════════════════════════════════════\n\nC O N T R A C T   –   S T A R F I E L D   R E T A I L   –   O M N I C H A N N E L   C R M   ( S I G N E D )\n\nContract Reference:  CNTR-1002\nDate of Agreement:   28 June 2026\nSigning Deadline:    5 July 2026\nPriority:            Medium\nOpportunity:         Starfield Retail – Omnichannel CRM\n\n════════════════════════════════════════════════════════════════════════════════\n\n1. PARTIES\n──────────\n\n   This Contract Agreement (the "Agreement") is entered into as of 28 June 2026 by and between:\n\n\n   Provider:\n\n   ArborMind Solutions Ltd.\n   1 Innovation Way, London, EC1A 1BB, United Kingdom\n   Contract Owner: [Contract Owner]\n\n\n   Customer / Counterparty:\n\n   Starfield Retail Solutions\n   [Customer Address]\n   Primary Contact: Kavitha Rajan\n\n   Each of the Provider and the Customer is referred to individually as a "Party" and collectively as the "Parties."\n\n\n2. BACKGROUND\n─────────────\n\n   5% early-sign discount applied. Includes implementation and first-year support.\n\n\n3. TERM & RENEWAL\n─────────────────\n\n   This Agreement shall remain in force for a term of 60 month(s), commencing on 12 July 2026 and expiring on 12 July 2031 (the "Initial Term"), unless terminated earlier in accordance with this Agreement.\n\n   Automatic Renewal: Upon expiry of the Initial Term, this Agreement shall automatically renew for successive periods of 12 month(s) unless either Party provides written notice of non-renewal at least 30 days prior to the end of the then-current term.\n\n\n4. SCOPE OF SERVICES & PRICING\n──────────────────────────────\n\n   The Provider shall provide the following products and/or services to the Customer during the Term:\n\n\n   Description                              Qty    List Price     Disc%    Unit Price        Amount\n   ------------------------------------------------------------------------------------------------\n   CRM Pro License                           60             —         —     £1,200.00    £72,000.00\n   Implementation & Onboarding                1             —         —     £4,500.00     £4,500.00\n   Data Migration Service                     1             —         —     £3,200.00     £3,200.00\n   Training Workshop (1 day)                  2             —         —     £1,800.00     £3,600.00\n   Priority Support (Annual)                  1             —         —     £2,400.00     £2,400.00\n   ------------------------------------------------------------------------------------------------\n                                                                                     Subtotal: £85,\n                                                                                     TOTAL: £85,700\n\n\n5. PAYMENT TERMS\n────────────────\n\n   Payment is due Net 30 from the date of invoice. All amounts are exclusive of applicable taxes unless otherwise stated. Invoices not paid within the agreed terms shall accrue interest at 2% per month on the outstanding balance.\n\n\n6. INTELLECTUAL PROPERTY\n────────────────────────\n\n   The Provider retains ownership of its pre-existing intellectual property. Unless otherwise agreed in writing, no transfer of intellectual property is implied by this Agreement.\n\n\n7. CONFIDENTIALITY\n──────────────────\n\n   Each Party agrees to hold the other Party's Confidential Information in strict confidence and not to disclose it to any third party without prior written consent. "Confidential Information" means any non-public information disclosed by one Party to the other in connection with this Agreement.\n\n   These confidentiality obligations shall survive termination or expiry of this Agreement for a period of 3 year(s).\n\n   Exceptions: These obligations do not apply to information that (a) is or becomes publicly available through no fault of the receiving Party; (b) was already known to the receiving Party; (c) is independently developed; or (d) is required to be disclosed by law or court order.\n\n\n8. LIABILITY & INDEMNIFICATION\n──────────────────────────────\n\n   The total aggregate liability of either Party shall not exceed the total fees paid by the Customer in the twelve (12) months preceding the claim.\n\n   Neither Party shall be liable for indirect, incidental, consequential, special, or exemplary damages arising out of or related to this Agreement, even if advised of the possibility of such damages.\n\n   Each Party shall indemnify and hold the other harmless against any third-party claims arising from its own breach of this Agreement, negligence, or wilful misconduct.\n\n\n9. TERMINATION\n──────────────\n\n   Either Party may terminate this Agreement for convenience upon 30 days' written notice to the other Party.\n\n   Either Party may terminate this Agreement immediately upon written notice if the other Party: (a) commits a material breach that remains uncured for 30 days after written notice; (b) becomes insolvent, makes an assignment for the benefit of creditors, or is subject to bankruptcy or liquidation proceedings.\n\n   Upon termination: (a) the Customer shall pay all amounts due for services rendered up to the termination date; (b) each Party shall return or destroy the other's Confidential Information; (c) any provisions that by their nature should survive shall survive termination.\n\n\n10. GOVERNING LAW & DISPUTE RESOLUTION\n──────────────────────────────────────\n\n   This Agreement shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict-of-law principles.\n\n   The Parties shall first attempt to resolve any dispute through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration under the rules of the relevant arbitration body in England and Wales, unless the Parties agree otherwise in writing.\n\n\n11. GENERAL PROVISIONS\n──────────────────────\n\n\n   Entire Agreement\n\n   This Agreement constitutes the entire agreement between the Parties with respect to its subject matter and supersedes all prior negotiations, representations, or agreements.\n\n\n   Amendments\n\n   No amendment to this Agreement shall be effective unless made in writing and signed by authorised representatives of both Parties.\n\n\n   Waiver\n\n   Failure by either Party to enforce any provision shall not constitute a waiver of that Party's right to enforce such provision in the future.\n\n\n   Severability\n\n   If any provision of this Agreement is found invalid or unenforceable, the remaining provisions shall continue in full force and effect.\n\n\n   Notices\n\n   All notices shall be in writing and delivered by email (with confirmation of receipt) or registered post to the addresses set out in Section 1.\n\n\n   Force Majeure\n\n   Neither Party shall be liable for delays or failures in performance resulting from causes beyond its reasonable control, including acts of God, natural disasters, war, pandemic, or government action, provided the affected Party gives prompt written notice.\n\n\n   Assignment\n\n   Neither Party may assign its rights or obligations under this Agreement without the prior written consent of the other Party, except that either Party may assign to an affiliate or successor in connection with a merger or acquisition.\n\n\n════════════════════════════════════════════════════════════════════════════════\n\n12. EXECUTION / SIGNATURES\n──────────────────────────\n\n   IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.\n\n\n   For and on behalf of ArborMind Solutions Ltd.:\n\n   Name:        [Authorised Signatory]\n   Title:       Authorised Representative\n   Signature:   _________________________________\n   Date:        _________________________________\n\n   For and on behalf of Starfield Retail Solutions:\n\n   Name:        Kavitha Rajan\n   Title:       Authorised Representative\n   Signature:   _________________________________\n   Date:        _________________________________\n\n════════════════════════════════════════════════════════════════════════════════\n   Document generated: 28 June 2026  |  CNTR-1002  |  Confidential\n════════════════════════════════════════════════════════════════════════════════	Generated from contract data	\N	2026-06-28 21:03:14.990371	f
5	21	3	Contract – Starfield Retail – Omnichannel CRM (Signed)	════════════════════════════════════════════════════════════════════════════════\n\nC O N T R A C T   –   S T A R F I E L D   R E T A I L   –   O M N I C H A N N E L   C R M   ( S I G N E D )\n\nContract Reference:  CNTR-1002\nDate of Agreement:   28 June 2026\nSigning Deadline:    5 July 2026\nPriority:            Medium\nOpportunity:         Starfield Retail – Omnichannel CRM\n\n════════════════════════════════════════════════════════════════════════════════\n\n1. PARTIES\n──────────\n\n   This Contract Agreement (the "Agreement") is entered into as of 28 June 2026 by and between:\n\n\n   Provider:\n\n   ArborMind Solutions Ltd.\n   1 Innovation Way, London, EC1A 1BB, United Kingdom\n   Contract Owner: [Contract Owner]\n\n\n   Customer / Counterparty:\n\n   Starfield Retail Solutions\n   [Customer Address]\n   Primary Contact: Meena Krishnan\n\n   Each of the Provider and the Customer is referred to individually as a "Party" and collectively as the "Parties."\n\n\n2. BACKGROUND\n─────────────\n\n   5% early-sign discount applied. Includes implementation and first-year support.\n\n\n3. TERM & RENEWAL\n─────────────────\n\n   This Agreement shall commence on 12 July 2026 and expire on [_______________], unless terminated earlier in accordance with this Agreement.\n\n   This Agreement will not automatically renew. The Parties must execute a new agreement or an amendment to continue the arrangement after the expiry date.\n\n\n4. SCOPE OF SERVICES & PRICING\n──────────────────────────────\n\n   The Provider shall provide the following products and/or services to the Customer during the Term:\n\n\n   Description                              Qty    List Price     Disc%    Unit Price        Amount\n   ------------------------------------------------------------------------------------------------\n   CRM Pro License                           60             —         —     £1,200.00    £72,000.00\n   Implementation & Onboarding                1             —         —     £4,500.00     £4,500.00\n   Data Migration Service                     1             —         —     £3,200.00     £3,200.00\n   Training Workshop (1 day)                  2             —         —     £1,800.00     £3,600.00\n   Priority Support (Annual)                  1             —         —     £2,400.00     £2,400.00\n   ------------------------------------------------------------------------------------------------\n                                                                                     Subtotal: £85,\n                                                                                     TOTAL: £85,700\n\n\n5. PAYMENT TERMS\n────────────────\n\n   Payment is due Net 30 from the date of invoice. All amounts are exclusive of applicable taxes unless otherwise stated. Invoices not paid within the agreed terms shall accrue interest at 2% per month on the outstanding balance.\n\n\n6. INTELLECTUAL PROPERTY\n────────────────────────\n\n   The Provider retains ownership of its pre-existing intellectual property. Unless otherwise agreed in writing, no transfer of intellectual property is implied by this Agreement.\n\n\n7. CONFIDENTIALITY\n──────────────────\n\n   Each Party agrees to hold the other Party's Confidential Information in strict confidence and not to disclose it to any third party without prior written consent. "Confidential Information" means any non-public information disclosed by one Party to the other in connection with this Agreement.\n\n   These confidentiality obligations shall survive termination or expiry of this Agreement for a period of 3 year(s).\n\n   Exceptions: These obligations do not apply to information that (a) is or becomes publicly available through no fault of the receiving Party; (b) was already known to the receiving Party; (c) is independently developed; or (d) is required to be disclosed by law or court order.\n\n\n8. LIABILITY & INDEMNIFICATION\n──────────────────────────────\n\n   The total aggregate liability of either Party shall not exceed the total fees paid by the Customer in the twelve (12) months preceding the claim.\n\n   Neither Party shall be liable for indirect, incidental, consequential, special, or exemplary damages arising out of or related to this Agreement, even if advised of the possibility of such damages.\n\n   Each Party shall indemnify and hold the other harmless against any third-party claims arising from its own breach of this Agreement, negligence, or wilful misconduct.\n\n\n9. TERMINATION\n──────────────\n\n   Either Party may terminate this Agreement for convenience upon 30 days' written notice to the other Party.\n\n   Either Party may terminate this Agreement immediately upon written notice if the other Party: (a) commits a material breach that remains uncured for 30 days after written notice; (b) becomes insolvent, makes an assignment for the benefit of creditors, or is subject to bankruptcy or liquidation proceedings.\n\n   Upon termination: (a) the Customer shall pay all amounts due for services rendered up to the termination date; (b) each Party shall return or destroy the other's Confidential Information; (c) any provisions that by their nature should survive shall survive termination.\n\n\n10. GOVERNING LAW & DISPUTE RESOLUTION\n──────────────────────────────────────\n\n   This Agreement shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict-of-law principles.\n\n   The Parties shall first attempt to resolve any dispute through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration under the rules of the relevant arbitration body in England and Wales, unless the Parties agree otherwise in writing.\n\n\n11. GENERAL PROVISIONS\n──────────────────────\n\n\n   Entire Agreement\n\n   This Agreement constitutes the entire agreement between the Parties with respect to its subject matter and supersedes all prior negotiations, representations, or agreements.\n\n\n   Amendments\n\n   No amendment to this Agreement shall be effective unless made in writing and signed by authorised representatives of both Parties.\n\n\n   Waiver\n\n   Failure by either Party to enforce any provision shall not constitute a waiver of that Party's right to enforce such provision in the future.\n\n\n   Severability\n\n   If any provision of this Agreement is found invalid or unenforceable, the remaining provisions shall continue in full force and effect.\n\n\n   Notices\n\n   All notices shall be in writing and delivered by email (with confirmation of receipt) or registered post to the addresses set out in Section 1.\n\n\n   Force Majeure\n\n   Neither Party shall be liable for delays or failures in performance resulting from causes beyond its reasonable control, including acts of God, natural disasters, war, pandemic, or government action, provided the affected Party gives prompt written notice.\n\n\n   Assignment\n\n   Neither Party may assign its rights or obligations under this Agreement without the prior written consent of the other Party, except that either Party may assign to an affiliate or successor in connection with a merger or acquisition.\n\n\n════════════════════════════════════════════════════════════════════════════════\n\n12. EXECUTION / SIGNATURES\n──────────────────────────\n\n   IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.\n\n\n   For and on behalf of ArborMind Solutions Ltd.:\n\n   Name:        [Authorised Signatory]\n   Title:       Authorised Representative\n   Signature:   _________________________________\n   Date:        _________________________________\n\n   For and on behalf of Starfield Retail Solutions:\n\n   Name:        Meena Krishnan\n   Title:       Authorised Representative\n   Signature:   _________________________________\n   Date:        _________________________________\n\n════════════════════════════════════════════════════════════════════════════════\n   Document generated: 28 June 2026  |  CNTR-1002  |  Confidential\n════════════════════════════════════════════════════════════════════════════════	Generated from contract data	\N	2026-06-28 21:22:55.468623	f
6	21	4	Contract – Starfield Retail – Omnichannel CRM (Signed)	════════════════════════════════════════════════════════════════════════════════\n\nC O N T R A C T   –   S T A R F I E L D   R E T A I L   –   O M N I C H A N N E L   C R M   ( S I G N E D )\n\nContract Reference:  CNTR-1002\nDate of Agreement:   28 June 2026\nSigning Deadline:    5 July 2026\nPriority:            Medium\nOpportunity:         Starfield Retail – Omnichannel CRM\n\n════════════════════════════════════════════════════════════════════════════════\n\n1. PARTIES\n──────────\n\n   This Contract Agreement (the "Agreement") is entered into as of 28 June 2026 by and between:\n\n\n   Provider:\n\n   ArborMind Solutions Ltd.\n   1 Innovation Way, London, EC1A 1BB, United Kingdom\n   Contract Owner: [Contract Owner]\n\n\n   Customer / Counterparty:\n\n   Starfield Retail Solutions\n   [Customer Address]\n   Primary Contact: Arjun Mehta\n\n   Each of the Provider and the Customer is referred to individually as a "Party" and collectively as the "Parties."\n\n\n2. BACKGROUND\n─────────────\n\n   5% early-sign discount applied. Includes implementation and first-year support.\n\n\n3. TERM & RENEWAL\n─────────────────\n\n   This Agreement shall commence on 25 July 2026 and expire on [_______________], unless terminated earlier in accordance with this Agreement.\n\n   This Agreement will not automatically renew. The Parties must execute a new agreement or an amendment to continue the arrangement after the expiry date.\n\n\n4. SCOPE OF SERVICES & PRICING\n──────────────────────────────\n\n   The Provider shall provide the following products and/or services to the Customer during the Term:\n\n\n   Description                              Qty    List Price     Disc%    Unit Price        Amount\n   ------------------------------------------------------------------------------------------------\n   CRM Pro License                           60             —         —     £1,200.00    £72,000.00\n   Implementation & Onboarding                1             —         —     £4,500.00     £4,500.00\n   Data Migration Service                     1             —         —     £3,200.00     £3,200.00\n   Training Workshop (1 day)                  2             —         —     £1,800.00     £3,600.00\n   Priority Support (Annual)                  1             —         —     £2,400.00     £2,400.00\n   ------------------------------------------------------------------------------------------------\n                                                                                     Subtotal: £85,\n                                                                                     TOTAL: £85,700\n\n\n5. PAYMENT TERMS\n────────────────\n\n   Payment is due Net 30 from the date of invoice. All amounts are exclusive of applicable taxes unless otherwise stated. Invoices not paid within the agreed terms shall accrue interest at 2% per month on the outstanding balance.\n\n\n6. INTELLECTUAL PROPERTY\n────────────────────────\n\n   The Provider retains ownership of its pre-existing intellectual property. Unless otherwise agreed in writing, no transfer of intellectual property is implied by this Agreement.\n\n\n7. CONFIDENTIALITY\n──────────────────\n\n   Each Party agrees to hold the other Party's Confidential Information in strict confidence and not to disclose it to any third party without prior written consent. "Confidential Information" means any non-public information disclosed by one Party to the other in connection with this Agreement.\n\n   These confidentiality obligations shall survive termination or expiry of this Agreement for a period of 3 year(s).\n\n   Exceptions: These obligations do not apply to information that (a) is or becomes publicly available through no fault of the receiving Party; (b) was already known to the receiving Party; (c) is independently developed; or (d) is required to be disclosed by law or court order.\n\n\n8. LIABILITY & INDEMNIFICATION\n──────────────────────────────\n\n   The total aggregate liability of either Party shall not exceed the total fees paid by the Customer in the twelve (12) months preceding the claim.\n\n   Neither Party shall be liable for indirect, incidental, consequential, special, or exemplary damages arising out of or related to this Agreement, even if advised of the possibility of such damages.\n\n   Each Party shall indemnify and hold the other harmless against any third-party claims arising from its own breach of this Agreement, negligence, or wilful misconduct.\n\n\n9. TERMINATION\n──────────────\n\n   Either Party may terminate this Agreement for convenience upon 30 days' written notice to the other Party.\n\n   Either Party may terminate this Agreement immediately upon written notice if the other Party: (a) commits a material breach that remains uncured for 30 days after written notice; (b) becomes insolvent, makes an assignment for the benefit of creditors, or is subject to bankruptcy or liquidation proceedings.\n\n   Upon termination: (a) the Customer shall pay all amounts due for services rendered up to the termination date; (b) each Party shall return or destroy the other's Confidential Information; (c) any provisions that by their nature should survive shall survive termination.\n\n\n10. GOVERNING LAW & DISPUTE RESOLUTION\n──────────────────────────────────────\n\n   This Agreement shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict-of-law principles.\n\n   The Parties shall first attempt to resolve any dispute through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration under the rules of the relevant arbitration body in England and Wales, unless the Parties agree otherwise in writing.\n\n\n11. GENERAL PROVISIONS\n──────────────────────\n\n\n   Entire Agreement\n\n   This Agreement constitutes the entire agreement between the Parties with respect to its subject matter and supersedes all prior negotiations, representations, or agreements.\n\n\n   Amendments\n\n   No amendment to this Agreement shall be effective unless made in writing and signed by authorised representatives of both Parties.\n\n\n   Waiver\n\n   Failure by either Party to enforce any provision shall not constitute a waiver of that Party's right to enforce such provision in the future.\n\n\n   Severability\n\n   If any provision of this Agreement is found invalid or unenforceable, the remaining provisions shall continue in full force and effect.\n\n\n   Notices\n\n   All notices shall be in writing and delivered by email (with confirmation of receipt) or registered post to the addresses set out in Section 1.\n\n\n   Force Majeure\n\n   Neither Party shall be liable for delays or failures in performance resulting from causes beyond its reasonable control, including acts of God, natural disasters, war, pandemic, or government action, provided the affected Party gives prompt written notice.\n\n\n   Assignment\n\n   Neither Party may assign its rights or obligations under this Agreement without the prior written consent of the other Party, except that either Party may assign to an affiliate or successor in connection with a merger or acquisition.\n\n\n════════════════════════════════════════════════════════════════════════════════\n\n12. EXECUTION / SIGNATURES\n──────────────────────────\n\n   IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.\n\n\n   For and on behalf of ArborMind Solutions Ltd.:\n\n   Name:        [Authorised Signatory]\n   Title:       Authorised Representative\n   Signature:   _________________________________\n   Date:        _________________________________\n\n   For and on behalf of Starfield Retail Solutions:\n\n   Name:        Arjun Mehta\n   Title:       Authorised Representative\n   Signature:   _________________________________\n   Date:        _________________________________\n\n════════════════════════════════════════════════════════════════════════════════\n   Document generated: 28 June 2026  |  CNTR-1002  |  Confidential\n════════════════════════════════════════════════════════════════════════════════	Generated from contract data	\N	2026-06-28 21:27:44.50653	f
7	21	5	Contract – Starfield Retail – Omnichannel CRM (Signed)	════════════════════════════════════════════════════════════════════════════════\n\nC O N T R A C T   –   S T A R F I E L D   R E T A I L   –   O M N I C H A N N E L   C R M   ( S I G N E D )\n\nContract Reference:  CNTR-1002\nDate of Agreement:   28 June 2026\nSigning Deadline:    5 July 2026\nPriority:            Medium\nOpportunity:         Starfield Retail – Omnichannel CRM\n\n════════════════════════════════════════════════════════════════════════════════\n\n1. PARTIES\n──────────\n\n   This Contract Agreement (the "Agreement") is entered into as of 28 June 2026 by and between:\n\n\n   Provider:\n\n   ArborMind Solutions Ltd.\n   1 Innovation Way, London, EC1A 1BB, United Kingdom\n   Contract Owner: [Contract Owner]\n\n\n   Customer / Counterparty:\n\n   Starfield Retail Solutions\n   [Customer Address]\n   Primary Contact: Arjun Mehta\n\n   Each of the Provider and the Customer is referred to individually as a "Party" and collectively as the "Parties."\n\n\n2. BACKGROUND\n─────────────\n\n   5% early-sign discount applied. Includes implementation and first-year support.\n\n\n3. TERM & RENEWAL\n─────────────────\n\n   This Agreement shall commence on 25 July 2026 and expire on [_______________], unless terminated earlier in accordance with this Agreement.\n\n   This Agreement will not automatically renew. The Parties must execute a new agreement or an amendment to continue the arrangement after the expiry date.\n\n\n4. SCOPE OF SERVICES & PRICING\n──────────────────────────────\n\n   The Provider shall provide the following products and/or services to the Customer during the Term:\n\n\n   Description                              Qty    List Price     Disc%    Unit Price        Amount\n   ------------------------------------------------------------------------------------------------\n   CRM Pro License                           60             —         —     £1,200.00    £72,000.00\n   Implementation & Onboarding                1             —         —     £4,500.00     £4,500.00\n   Data Migration Service                     1             —         —     £3,200.00     £3,200.00\n   Training Workshop (1 day)                  2             —         —     £1,800.00     £3,600.00\n   Priority Support (Annual)                  1             —         —     £2,400.00     £2,400.00\n   ------------------------------------------------------------------------------------------------\n                                                                                     Subtotal: £85,\n                                                                                     TOTAL: £85,700\n\n\n5. PAYMENT TERMS\n────────────────\n\n   Payment is due Net 30 from the date of invoice. All amounts are exclusive of applicable taxes unless otherwise stated. Invoices not paid within the agreed terms shall accrue interest at 2% per month on the outstanding balance.\n\n\n6. INTELLECTUAL PROPERTY\n────────────────────────\n\n   The Provider retains ownership of its pre-existing intellectual property. Unless otherwise agreed in writing, no transfer of intellectual property is implied by this Agreement.\n\n\n7. CONFIDENTIALITY\n──────────────────\n\n   Each Party agrees to hold the other Party's Confidential Information in strict confidence and not to disclose it to any third party without prior written consent. "Confidential Information" means any non-public information disclosed by one Party to the other in connection with this Agreement.\n\n   These confidentiality obligations shall survive termination or expiry of this Agreement for a period of 3 year(s).\n\n   Exceptions: These obligations do not apply to information that (a) is or becomes publicly available through no fault of the receiving Party; (b) was already known to the receiving Party; (c) is independently developed; or (d) is required to be disclosed by law or court order.\n\n\n8. LIABILITY & INDEMNIFICATION\n──────────────────────────────\n\n   The total aggregate liability of either Party shall not exceed the total fees paid by the Customer in the twelve (12) months preceding the claim.\n\n   Neither Party shall be liable for indirect, incidental, consequential, special, or exemplary damages arising out of or related to this Agreement, even if advised of the possibility of such damages.\n\n   Each Party shall indemnify and hold the other harmless against any third-party claims arising from its own breach of this Agreement, negligence, or wilful misconduct.\n\n\n9. TERMINATION\n──────────────\n\n   Either Party may terminate this Agreement for convenience upon 30 days' written notice to the other Party.\n\n   Either Party may terminate this Agreement immediately upon written notice if the other Party: (a) commits a material breach that remains uncured for 30 days after written notice; (b) becomes insolvent, makes an assignment for the benefit of creditors, or is subject to bankruptcy or liquidation proceedings.\n\n   Upon termination: (a) the Customer shall pay all amounts due for services rendered up to the termination date; (b) each Party shall return or destroy the other's Confidential Information; (c) any provisions that by their nature should survive shall survive termination.\n\n\n10. GOVERNING LAW & DISPUTE RESOLUTION\n──────────────────────────────────────\n\n   This Agreement shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict-of-law principles.\n\n   The Parties shall first attempt to resolve any dispute through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration under the rules of the relevant arbitration body in England and Wales, unless the Parties agree otherwise in writing.\n\n\n11. GENERAL PROVISIONS\n──────────────────────\n\n\n   Entire Agreement\n\n   This Agreement constitutes the entire agreement between the Parties with respect to its subject matter and supersedes all prior negotiations, representations, or agreements.\n\n\n   Amendments\n\n   No amendment to this Agreement shall be effective unless made in writing and signed by authorised representatives of both Parties.\n\n\n   Waiver\n\n   Failure by either Party to enforce any provision shall not constitute a waiver of that Party's right to enforce such provision in the future.\n\n\n   Severability\n\n   If any provision of this Agreement is found invalid or unenforceable, the remaining provisions shall continue in full force and effect.\n\n\n   Notices\n\n   All notices shall be in writing and delivered by email (with confirmation of receipt) or registered post to the addresses set out in Section 1.\n\n\n   Force Majeure\n\n   Neither Party shall be liable for delays or failures in performance resulting from causes beyond its reasonable control, including acts of God, natural disasters, war, pandemic, or government action, provided the affected Party gives prompt written notice.\n\n\n   Assignment\n\n   Neither Party may assign its rights or obligations under this Agreement without the prior written consent of the other Party, except that either Party may assign to an affiliate or successor in connection with a merger or acquisition.\n\n\n════════════════════════════════════════════════════════════════════════════════\n\n12. EXECUTION / SIGNATURES\n──────────────────────────\n\n   IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.\n\n\n   For and on behalf of ArborMind Solutions Ltd.:\n\n   Name:        [Authorised Signatory]\n   Title:       Authorised Representative\n   Signature:   _________________________________\n   Date:        _________________________________\n\n   For and on behalf of Starfield Retail Solutions:\n\n   Name:        Arjun Mehta\n   Title:       Authorised Representative\n   Signature:   _________________________________\n   Date:        _________________________________\n\n════════════════════════════════════════════════════════════════════════════════\n   Document generated: 28 June 2026  |  CNTR-1002  |  Confidential\n════════════════════════════════════════════════════════════════════════════════	Generated from contract data	\N	2026-06-28 21:48:15.808776	f
8	21	6	Contract – Starfield Retail – Omnichannel CRM (Signed)	════════════════════════════════════════════════════════════════════════════════\n\nC O N T R A C T   –   S T A R F I E L D   R E T A I L   –   O M N I C H A N N E L   C R M   ( S I G N E D )\n\nContract Reference:  CNTR-1002\nDate of Agreement:   28 June 2026\nSigning Deadline:    5 July 2026\nPriority:            Medium\nOpportunity:         Starfield Retail – Omnichannel CRM\n\n════════════════════════════════════════════════════════════════════════════════\n\n1. PARTIES\n──────────\n\n   This Contract Agreement (the "Agreement") is entered into as of 28 June 2026 by and between:\n\n\n   Provider:\n\n   ArborMind Solutions Ltd.\n   1 Innovation Way, London, EC1A 1BB, United Kingdom\n   Contract Owner: [Contract Owner]\n\n\n   Customer / Counterparty:\n\n   Starfield Retail Solutions\n   [Customer Address]\n   Primary Contact: Arjun Mehta\n\n   Each of the Provider and the Customer is referred to individually as a "Party" and collectively as the "Parties."\n\n\n2. BACKGROUND\n─────────────\n\n   5% early-sign discount applied. Includes implementation and first-year support.\n\n\n3. TERM & RENEWAL\n─────────────────\n\n   This Agreement shall commence on 25 July 2026 and expire on [_______________], unless terminated earlier in accordance with this Agreement.\n\n   This Agreement will not automatically renew. The Parties must execute a new agreement or an amendment to continue the arrangement after the expiry date.\n\n\n4. SCOPE OF SERVICES & PRICING\n──────────────────────────────\n\n   The Provider shall provide the following products and/or services to the Customer during the Term:\n\n\n   Description                              Qty    List Price     Disc%    Unit Price        Amount\n   ------------------------------------------------------------------------------------------------\n   CRM Pro License                           60             —         —     £1,200.00    £72,000.00\n   Implementation & Onboarding                1             —         —     £4,500.00     £4,500.00\n   Data Migration Service                     1             —         —     £3,200.00     £3,200.00\n   Training Workshop (1 day)                  2             —         —     £1,800.00     £3,600.00\n   Priority Support (Annual)                  1             —         —     £2,400.00     £2,400.00\n   ------------------------------------------------------------------------------------------------\n                                                                                     Subtotal: £85,\n                                                                                     TOTAL: £85,700\n\n\n5. PAYMENT TERMS\n────────────────\n\n   Payment is due Net 30 from the date of invoice. All amounts are exclusive of applicable taxes unless otherwise stated. Invoices not paid within the agreed terms shall accrue interest at 2% per month on the outstanding balance.\n\n\n6. INTELLECTUAL PROPERTY\n────────────────────────\n\n   The Provider retains ownership of its pre-existing intellectual property. Unless otherwise agreed in writing, no transfer of intellectual property is implied by this Agreement.\n\n\n7. CONFIDENTIALITY\n──────────────────\n\n   Each Party agrees to hold the other Party's Confidential Information in strict confidence and not to disclose it to any third party without prior written consent. "Confidential Information" means any non-public information disclosed by one Party to the other in connection with this Agreement.\n\n   These confidentiality obligations shall survive termination or expiry of this Agreement for a period of 3 year(s).\n\n   Exceptions: These obligations do not apply to information that (a) is or becomes publicly available through no fault of the receiving Party; (b) was already known to the receiving Party; (c) is independently developed; or (d) is required to be disclosed by law or court order.\n\n\n8. LIABILITY & INDEMNIFICATION\n──────────────────────────────\n\n   The total aggregate liability of either Party shall not exceed the total fees paid by the Customer in the twelve (12) months preceding the claim.\n\n   Neither Party shall be liable for indirect, incidental, consequential, special, or exemplary damages arising out of or related to this Agreement, even if advised of the possibility of such damages.\n\n   Each Party shall indemnify and hold the other harmless against any third-party claims arising from its own breach of this Agreement, negligence, or wilful misconduct.\n\n\n9. TERMINATION\n──────────────\n\n   Either Party may terminate this Agreement for convenience upon 30 days' written notice to the other Party.\n\n   Either Party may terminate this Agreement immediately upon written notice if the other Party: (a) commits a material breach that remains uncured for 30 days after written notice; (b) becomes insolvent, makes an assignment for the benefit of creditors, or is subject to bankruptcy or liquidation proceedings.\n\n   Upon termination: (a) the Customer shall pay all amounts due for services rendered up to the termination date; (b) each Party shall return or destroy the other's Confidential Information; (c) any provisions that by their nature should survive shall survive termination.\n\n\n10. GOVERNING LAW & DISPUTE RESOLUTION\n──────────────────────────────────────\n\n   This Agreement shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict-of-law principles.\n\n   The Parties shall first attempt to resolve any dispute through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration under the rules of the relevant arbitration body in England and Wales, unless the Parties agree otherwise in writing.\n\n\n11. GENERAL PROVISIONS\n──────────────────────\n\n\n   Entire Agreement\n\n   This Agreement constitutes the entire agreement between the Parties with respect to its subject matter and supersedes all prior negotiations, representations, or agreements.\n\n\n   Amendments\n\n   No amendment to this Agreement shall be effective unless made in writing and signed by authorised representatives of both Parties.\n\n\n   Waiver\n\n   Failure by either Party to enforce any provision shall not constitute a waiver of that Party's right to enforce such provision in the future.\n\n\n   Severability\n\n   If any provision of this Agreement is found invalid or unenforceable, the remaining provisions shall continue in full force and effect.\n\n\n   Notices\n\n   All notices shall be in writing and delivered by email (with confirmation of receipt) or registered post to the addresses set out in Section 1.\n\n\n   Force Majeure\n\n   Neither Party shall be liable for delays or failures in performance resulting from causes beyond its reasonable control, including acts of God, natural disasters, war, pandemic, or government action, provided the affected Party gives prompt written notice.\n\n\n   Assignment\n\n   Neither Party may assign its rights or obligations under this Agreement without the prior written consent of the other Party, except that either Party may assign to an affiliate or successor in connection with a merger or acquisition.\n\n\n════════════════════════════════════════════════════════════════════════════════\n\n12. EXECUTION / SIGNATURES\n──────────────────────────\n\n   IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.\n\n\n   For and on behalf of ArborMind Solutions Ltd.:\n\n   Name:        [Authorised Signatory]\n   Title:       Authorised Representative\n   Signature:   _________________________________\n   Date:        _________________________________\n\n   For and on behalf of Starfield Retail Solutions:\n\n   Name:        Arjun Mehta\n   Title:       Authorised Representative\n   Signature:   _________________________________\n   Date:        _________________________________\n\n════════════════════════════════════════════════════════════════════════════════\n   Document generated: 28 June 2026  |  CNTR-1002  |  Confidential\n════════════════════════════════════════════════════════════════════════════════	Generated from contract data	\N	2026-06-28 21:58:02.099814	f
9	21	7	Contract – Starfield Retail – Omnichannel CRM (Signed)	════════════════════════════════════════════════════════════════════════════════\n\nC O N T R A C T   –   S T A R F I E L D   R E T A I L   –   O M N I C H A N N E L   C R M   ( S I G N E D )\n\nType: Amendment\nContract Reference:  CNTR-1002\nDate of Agreement:   28 June 2026\nSigning Deadline:    5 July 2026\nPriority:            Critical\nTerritory / Region:  buckhinghamshire\nOpportunity:         Starfield Retail – Omnichannel CRM\n\n════════════════════════════════════════════════════════════════════════════════\n\n1. PARTIES\n──────────\n\n   This Amendment (the "Agreement") is entered into as of 28 June 2026 by and between:\n\n\n   Provider:\n\n   ArborMind Solutions Ltd.\n   1 Innovation Way, London, EC1A 1BB, United Kingdom\n   Contract Owner: [Contract Owner]\n\n\n   Customer / Counterparty:\n\n   Starfield Retail Solutions\n   [Customer Address]\n   Primary Contact: Arjun Mehta\n\n   Each of the Provider and the Customer is referred to individually as a "Party" and collectively as the "Parties."\n\n\n2. BACKGROUND\n─────────────\n\n   5% early-sign discount applied. Includes implementation and first-year support.\n\n\n3. TERM & RENEWAL\n─────────────────\n\n   This Agreement shall commence on 25 July 2026 and expire on [_______________], unless terminated earlier in accordance with this Agreement.\n\n   This Agreement will not automatically renew. The Parties must execute a new agreement or an amendment to continue the arrangement after the expiry date.\n\n\n4. SCOPE OF SERVICES & PRICING\n──────────────────────────────\n\n   The Provider shall provide the following products and/or services to the Customer during the Term:\n\n\n   Description                              Qty    List Price     Disc%    Unit Price        Amount\n   ------------------------------------------------------------------------------------------------\n   CRM Pro License                           60             —         —     £1,200.00    £72,000.00\n   Implementation & Onboarding                1             —         —     £4,500.00     £4,500.00\n   Data Migration Service                     1             —         —     £3,200.00     £3,200.00\n   Training Workshop (1 day)                  2             —         —     £1,800.00     £3,600.00\n   Priority Support (Annual)                  1             —         —     £2,400.00     £2,400.00\n   ------------------------------------------------------------------------------------------------\n                                                                                     Subtotal: £85,\n                                                                                     TOTAL: £85,700\n\n\n5. PAYMENT TERMS\n────────────────\n\n   Payment is due Upfront from the date of invoice. All amounts are exclusive of applicable taxes unless otherwise stated. Invoices not paid within the agreed terms shall accrue interest at 2% per month on the outstanding balance.\n\n\n6. INTELLECTUAL PROPERTY\n────────────────────────\n\n   All intellectual property, including deliverables, developed by the Provider under this Agreement shall remain the sole property of the Provider. The Customer is granted a non-exclusive, non-transferable licence to use such deliverables for the duration of this Agreement.\n\n\n7. CONFIDENTIALITY\n──────────────────\n\n   Each Party agrees to hold the other Party's Confidential Information in strict confidence and not to disclose it to any third party without prior written consent. "Confidential Information" means any non-public information disclosed by one Party to the other in connection with this Agreement.\n\n   These confidentiality obligations shall survive termination or expiry of this Agreement for a period of 3 year(s).\n\n   Exceptions: These obligations do not apply to information that (a) is or becomes publicly available through no fault of the receiving Party; (b) was already known to the receiving Party; (c) is independently developed; or (d) is required to be disclosed by law or court order.\n\n\n8. LIABILITY & INDEMNIFICATION\n──────────────────────────────\n\n   The total aggregate liability of either Party shall not exceed the total fees paid by the Customer in the twelve (12) months preceding the claim.\n\n   Neither Party shall be liable for indirect, incidental, consequential, special, or exemplary damages arising out of or related to this Agreement, even if advised of the possibility of such damages.\n\n   Each Party shall indemnify and hold the other harmless against any third-party claims arising from its own breach of this Agreement, negligence, or wilful misconduct.\n\n\n9. TERMINATION\n──────────────\n\n   Either Party may terminate this Agreement for convenience upon 90 days' written notice to the other Party.\n\n   Either Party may terminate this Agreement immediately upon written notice if the other Party: (a) commits a material breach that remains uncured for 30 days after written notice; (b) becomes insolvent, makes an assignment for the benefit of creditors, or is subject to bankruptcy or liquidation proceedings.\n\n   Upon termination: (a) the Customer shall pay all amounts due for services rendered up to the termination date; (b) each Party shall return or destroy the other's Confidential Information; (c) any provisions that by their nature should survive shall survive termination.\n\n\n10. GOVERNING LAW & DISPUTE RESOLUTION\n──────────────────────────────────────\n\n   This Agreement shall be governed by and construed in accordance with the laws of UK, without regard to conflict-of-law principles.\n\n   The Parties shall first attempt to resolve any dispute through good-faith negotiation. If unresolved within 30 days, disputes shall be submitted to binding arbitration under the rules of the relevant arbitration body in UK, unless the Parties agree otherwise in writing.\n\n\n11. GENERAL PROVISIONS\n──────────────────────\n\n\n   Entire Agreement\n\n   This Agreement constitutes the entire agreement between the Parties with respect to its subject matter and supersedes all prior negotiations, representations, or agreements.\n\n\n   Amendments\n\n   No amendment to this Agreement shall be effective unless made in writing and signed by authorised representatives of both Parties.\n\n\n   Waiver\n\n   Failure by either Party to enforce any provision shall not constitute a waiver of that Party's right to enforce such provision in the future.\n\n\n   Severability\n\n   If any provision of this Agreement is found invalid or unenforceable, the remaining provisions shall continue in full force and effect.\n\n\n   Notices\n\n   All notices shall be in writing and delivered by email (with confirmation of receipt) or registered post to the addresses set out in Section 1.\n\n\n   Force Majeure\n\n   Neither Party shall be liable for delays or failures in performance resulting from causes beyond its reasonable control, including acts of God, natural disasters, war, pandemic, or government action, provided the affected Party gives prompt written notice.\n\n\n   Assignment\n\n   Neither Party may assign its rights or obligations under this Agreement without the prior written consent of the other Party, except that either Party may assign to an affiliate or successor in connection with a merger or acquisition.\n\n\n════════════════════════════════════════════════════════════════════════════════\n\n12. EXECUTION / SIGNATURES\n──────────────────────────\n\n   IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.\n\n\n   For and on behalf of ArborMind Solutions Ltd.:\n\n   Name:        [Authorised Signatory]\n   Title:       Authorised Representative\n   Signature:   _________________________________\n   Date:        _________________________________\n\n   For and on behalf of Starfield Retail Solutions:\n\n   Name:        Arjun Mehta\n   Title:       Authorised Representative\n   Signature:   _________________________________\n   Date:        _________________________________\n\n════════════════════════════════════════════════════════════════════════════════\n   Document generated: 28 June 2026  |  CNTR-1002  |  Confidential\n════════════════════════════════════════════════════════════════════════════════	Generated from contract data	\N	2026-06-28 22:23:54.664156	t
\.


--
-- Data for Name: contract_line_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contract_line_items (id, contract_id, product_id, product_name, quantity, list_price, unit_price, discount, total, created_at) FROM stdin;
24	21	1	CRM Pro License	60.00	1200.00	1200.00	0.00	72000.00	2026-06-28 20:36:11.760558
25	21	3	Implementation & Onboarding	1.00	4500.00	4500.00	0.00	4500.00	2026-06-28 20:36:11.760558
26	21	6	Data Migration Service	1.00	3200.00	3200.00	0.00	3200.00	2026-06-28 20:36:11.760558
27	21	7	Training Workshop (1 day)	2.00	1800.00	1800.00	0.00	3600.00	2026-06-28 20:36:11.760558
28	21	5	Priority Support (Annual)	1.00	2400.00	2400.00	0.00	2400.00	2026-06-28 20:36:11.760558
29	22	1	CRM Pro License	72.00	1200.00	1200.00	0.00	86400.00	2026-06-28 20:36:31.393704
30	22	3	Implementation & Onboarding	1.00	4500.00	4500.00	0.00	4500.00	2026-06-28 20:36:31.393704
31	22	4	Custom Integration Package	1.00	8000.00	8000.00	0.00	8000.00	2026-06-28 20:36:31.393704
32	22	5	Priority Support (Annual)	1.00	2400.00	2400.00	0.00	2400.00	2026-06-28 20:36:31.393704
33	22	8	AI Insights Add-on	72.00	600.00	600.00	0.00	43200.00	2026-06-28 20:36:31.393704
\.


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contracts (id, contract_number, name, account_id, contact_id, opportunity_id, price_book_id, owner_id, status, start_date, contract_term_months, end_date, signed_date, company_signed_by_id, customer_signed_by_contact_id, auto_renew, renewal_term_months, special_terms, description, subtotal, discount, tax, total, activated_at, terminated_at, termination_reason, created_by_user_id, created_at, updated_at, contract_type, territory, business_unit, priority, governing_law, payment_terms, liability_cap_multiplier, confidentiality_period_years, ip_ownership, termination_notice_days, counterparty_company, counterparty_signer_name, counterparty_signer_email, counterparty_signer_title, counterparty_address, signing_provider, signing_order, signing_deadline, renewal_status, renewal_decision_date, renewal_window_days, arr_at_risk, yearly_escalation_pct, minimum_annual_commit, risk_score, redline_round, template_id) FROM stdin;
21	CNTR-1002	Contract – Starfield Retail – Omnichannel CRM (Signed)	4	8	3	\N	\N	draft	2026-07-25 00:00:00	\N	\N	\N	\N	\N	f	12	\N	5% early-sign discount applied. Includes implementation and first-year support.	85700.00	0.00	0.00	85700.00	\N	\N	\N	\N	2026-06-28 20:36:11.744524	2026-06-28 22:23:34.442986	Amendment	buckhinghamshire	\N	Critical	UK	Upfront	\N	\N	Vendor Owns	90	\N	\N	\N	\N	\N	DocuSign	Parallel	2026-07-05	\N	\N	90	\N	\N	\N	\N	0	\N
22	CNTR-1003	Contract – Apex Technologies – Enterprise CRM Proposal	1	1	1	\N	\N	draft	\N	\N	2026-06-15 00:00:00	\N	\N	\N	f	\N	\N	7% volume discount applied. Prices in INR equivalent billed as USD. Net 30 payment terms.	144500.00	0.00	0.00	144500.00	\N	\N	\N	\N	2026-06-28 20:36:31.389347	2026-06-28 22:13:46.151239	MSA	EMEA		High	UK	Net 30	\N	\N	Vendor Owns	\N					\N	\N	Sequential	\N	\N	\N	90	\N	\N	\N	\N	0	\N
\.


--
-- Data for Name: email_attachments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_attachments (id, tracking_id, token, filename, content_type, size_bytes, content, open_count, opened_at, last_opened_at, last_ip, last_user_agent, created_at) FROM stdin;
\.


--
-- Data for Name: email_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_settings (id, imap_host, imap_port, imap_user, imap_password, imap_secure, smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure, smtp_from_name, sync_enabled, sync_interval_minutes, last_sync_at, last_sync_status, last_sync_message, emails_processed, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: email_tracking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_tracking (id, activity_id, token, message_id, to_email, subject, sent_at, opened_at, last_opened_at, open_count, last_ip, last_user_agent) FROM stdin;
\.


--
-- Data for Name: emails; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.emails (id, message_uid, message_id, in_reply_to, from_email, from_name, subject, message, body_html, status, related_contact_id, related_lead_id, related_opportunity_id, is_known_customer, notes, auto_replied_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: enquiries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.enquiries (id, name, email, phone, company, message, created_at) FROM stdin;
\.


--
-- Data for Name: entity_notes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_notes (id, entity_type, entity_id, body, attachment_name, attachment_url, created_by, created_by_name, created_at, updated_at) FROM stdin;
13	contract	21	Test note	\N	\N	\N	Dev Admin	2026-06-28 22:34:20.616404	2026-06-28 22:34:20.616404
14	contract	21	Before termination both the parties agree and customer should pay 25% of the total amount agreed.	\N	\N	\N	Dev Admin	2026-06-28 22:36:01.259919	2026-06-28 22:36:01.259919
\.


--
-- Data for Name: lead_contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_contacts (id, lead_id, contact_id, created_at) FROM stdin;
\.


--
-- Data for Name: lead_insights; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_insights (id, lead_id, company_size, industry_segment, product_summary, recent_news, hiring_trend, tech_stack, social_presence, sentiment, growth_indicators, buying_intent_signals, ai_score_boost, buyer_classification, confidence, raw_insights, analysis_summary, ceo_name, ceo_title, ceo_linkedin, headquarters, founded_year, estimated_market_value, funding_stage, key_competitors, recent_achievements, linkedin_url, twitter_handle, facebook_url, instagram_handle, youtube_url, best_contact_name, best_contact_title, best_contact_email, email_pattern, blog_url, created_at) FROM stdin;
\.


--
-- Data for Name: lead_score_milestones; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_score_milestones (id, label, min_score, max_score, color, sort_order, created_at, updated_at) FROM stdin;
1	Cold	0	25	blue	0	2026-06-28 13:56:17.132573	2026-06-28 13:56:17.132573
2	Warm	26	50	yellow	1	2026-06-28 13:56:17.132573	2026-06-28 13:56:17.132573
3	Hot	51	75	orange	2	2026-06-28 13:56:17.132573	2026-06-28 13:56:17.132573
4	Qualified	76	100	green	3	2026-06-28 13:56:17.132573	2026-06-28 13:56:17.132573
\.


--
-- Data for Name: lead_scoring_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.lead_scoring_rules (id, rule_type, key, label, description, points, params, is_active, sort_order, created_at, updated_at) FROM stdin;
1	activity	call_completed	Completed Phone Call	A phone call was logged and completed	10	\N	t	10	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
2	activity	email_sent	Email Activity Logged	An email was sent or received	5	\N	t	11	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
3	activity	meeting_held	Meeting Completed	A meeting was held with the lead	15	\N	t	12	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
4	activity	demo_completed	Product Demo Completed	A product demo was delivered to the lead	20	\N	t	13	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
5	activity	task_completed	Task Completed	A follow-up task was completed	3	\N	t	14	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
6	activity	note_added	Note Added to Lead	A note was logged for this lead	2	\N	t	15	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
7	field	has_email	Email Address Provided	Lead has an email address on file	10	\N	t	20	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
8	field	has_phone	Phone Number Provided	Lead has a phone number on file	5	\N	t	21	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
9	field	has_company	Company Name Provided	Lead has a company name on file	10	\N	t	22	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
10	field	has_title	Job Title Provided	Lead has a job title on file	5	\N	t	23	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
11	field	has_industry	Industry Specified	Lead's industry is known	5	\N	t	24	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
12	field	has_description	Lead Description Added	A description or notes are present	3	\N	t	25	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
13	field	has_annual_revenue	Annual Revenue Known	Lead's annual revenue is on file	5	\N	t	26	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
14	field	has_employees	Employee Count Known	Lead's employee count is on file	2	\N	t	27	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
15	qualification	business_email	Business Email Domain	Email is not from a free provider (Gmail, Yahoo, etc.)	10	\N	t	30	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
16	qualification	seniority_clevel	C-Level Executive	Title matches CEO, CTO, CFO, President, Founder, etc.	15	\N	t	31	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
17	qualification	seniority_vp	VP / Vice President	Title matches VP or Vice President	12	\N	t	32	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
18	qualification	seniority_director	Director / Head of	Title matches Director or Head of	10	\N	t	33	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
19	qualification	seniority_manager	Manager / Senior / Lead	Title matches Manager, Senior, or Lead	8	\N	t	34	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
20	qualification	source_referral	Referral or Partner Source	Lead came from a referral or partner channel	10	\N	t	35	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
21	qualification	source_inbound	Inbound / Website Source	Lead came inbound via website, SEO, or organic traffic	8	\N	t	36	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
22	qualification	source_event	Event / Conference Source	Lead was met at a conference, webinar, or event	6	\N	t	37	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
23	qualification	source_paid	Paid / Outbound Source	Lead came via paid ads or cold outreach	3	\N	t	38	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
24	company_size	employees_1_10	1–10 Employees	Small startup or micro-business	4	{"max": 10, "min": 1}	t	40	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
25	company_size	employees_11_50	11–50 Employees	Small business	8	{"max": 50, "min": 11}	t	41	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
26	company_size	employees_51_200	51–200 Employees	Mid-market company	12	{"max": 200, "min": 51}	t	42	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
27	company_size	employees_201_1000	201–1,000 Employees	Growing enterprise	16	{"max": 1000, "min": 201}	t	43	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
28	company_size	employees_1001_plus	1,001+ Employees	Large enterprise	20	{"max": 9999999, "min": 1001}	t	44	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
29	revenue	revenue_under_100k	Revenue < $100K	Annual revenue under $100,000	2	{"max": 99999, "min": 1}	t	50	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
30	revenue	revenue_100k_1m	Revenue $100K–$1M	Annual revenue $100K to $1M	4	{"max": 999999, "min": 100000}	t	51	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
31	revenue	revenue_1m_10m	Revenue $1M–$10M	Annual revenue $1M to $10M	7	{"max": 9999999, "min": 1000000}	t	52	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
32	revenue	revenue_10m_plus	Revenue > $10M	Annual revenue over $10M	10	{"max": 999999999, "min": 10000000}	t	53	2026-06-28 13:56:17.121334	2026-06-28 13:56:17.121334
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leads (id, first_name, last_name, email, phone, website, company, title, status, source, score, annual_revenue, employees, industry, description, assigned_to, is_converted, converted_contact_id, converted_account_id, converted_opportunity_id, buyer_classification, insights_generated_at, created_at, updated_at) FROM stdin;
1	Sanjay	Gupta	sanjay.gupta@techlabs.io	+91-97654-32109	\N	TechLabs India	Head of IT	new	website	85	2500000.00	150	Technology	Interested in replacing their Zoho CRM for a 45-seat deployment.	\N	f	\N	\N	\N	\N	\N	2026-06-28 14:00:47.578501	2026-06-28 14:00:47.578501
2	Deepa	Menon	deepa.m@brightlogistics.com	+91-86543-21098	\N	Bright Logistics	Operations Director	contacted	linkedin	72	5800000.00	280	Logistics	Looking for CRM with GPS tracking integration for field sales team.	\N	f	\N	\N	\N	\N	\N	2026-06-28 14:00:47.578501	2026-06-28 14:00:47.578501
3	Anil	Kapoor	anil.k@pulsepharma.com	+91-75432-10987	\N	Pulse Pharma	Country Manager	qualified	referral	91	18000000.00	620	Pharmaceuticals	Evaluating enterprise CRM for 120 medical reps across 8 states.	\N	f	\N	\N	\N	\N	\N	2026-06-28 14:00:47.578501	2026-06-28 14:00:47.578501
4	Lakshmi	Narayanan	lakshmi.n@novafin.in	+91-64321-09876	\N	NovaFin	CEO	new	conference	65	900000.00	45	Financial Services	Seed-stage fintech startup needing lightweight CRM for investor relations.	\N	f	\N	\N	\N	\N	\N	2026-06-28 14:00:47.578501	2026-06-28 14:00:47.578501
5	Praveen	Kumar	praveen.k@solargenix.com	+91-53210-98765	\N	SolarGenix	VP Sales	contacted	inbound	78	3200000.00	112	Energy	Solar EPC company expanding to B2B enterprise accounts.	\N	f	\N	\N	\N	\N	\N	2026-06-28 14:00:47.578501	2026-06-28 14:00:47.578501
6	Gauri	Agarwal	gauri.a@nexwave.tech	+91-42109-87654	\N	NexWave Tech	CTO	qualified	partner	88	1800000.00	95	Technology	Wants CRM integrated with their Jira/Slack/Hubspot stack.	\N	f	\N	\N	\N	\N	\N	2026-06-28 14:00:47.578501	2026-06-28 14:00:47.578501
7	Mohammed	Rizvi	m.rizvi@coastalfoods.in	+91-31098-76543	\N	Coastal Foods	MD	new	referral	55	42000000.00	1400	Food & Beverage	Large FMCG player exploring CRM for their 200-person distributor sales team.	\N	f	\N	\N	\N	\N	\N	2026-06-28 14:00:47.578501	2026-06-28 14:00:47.578501
8	Tanvi	Joshi	tanvi.j@brandcraft.co	+91-20987-65432	\N	BrandCraft Agency	CEO	contacted	website	60	720000.00	38	Marketing	Creative agency wanting CRM to manage retainer clients and campaign pipelines.	\N	f	\N	\N	\N	\N	\N	2026-06-28 14:00:47.578501	2026-06-28 14:00:47.578501
9	Vijay	Nair	vijay.n@precisionauto.in	+91-19876-54321	\N	Precision Auto Parts	GM Sales	qualified	trade show	80	8900000.00	310	Automotive	Auto parts distributor needing quote generation and territory management.	\N	f	\N	\N	\N	\N	\N	2026-06-28 14:00:47.578501	2026-06-28 14:00:47.578501
10	Swati	Deshpande	swati.d@skyarchitects.com	+91-98760-54321	\N	Sky Architects	Partner	new	website	48	480000.00	22	Architecture	Small architecture firm needing project-based CRM for client management.	\N	f	\N	\N	\N	\N	\N	2026-06-28 14:00:47.578501	2026-06-28 14:00:47.578501
\.


--
-- Data for Name: opportunities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.opportunities (id, name, account_id, contact_id, stage, amount, probability, close_date, description, assigned_to, lead_source, next_step, forecast_category, team_members, price_book_id, created_at, updated_at) FROM stdin;
1	Apex Technologies – Enterprise CRM Rollout	1	1	proposal	142000.00	65	2026-06-30 00:00:00	320-seat CRM Pro rollout with custom ERP integration, 18-month contract.	\N	referral	Send revised commercial proposal with revised SLAs.	\N	\N	\N	2026-06-28 14:00:47.582551	2026-06-28 14:00:47.582551
2	Meridian Healthcare – Clinical CRM Pilot	2	3	negotiation	68000.00	80	2026-05-15 00:00:00	50-seat pilot across 3 hospitals. IT and procurement sign-off pending.	\N	conference	Legal review of DPA & HIPAA clauses by their compliance team.	\N	\N	\N	2026-06-28 14:00:47.582551	2026-06-28 14:00:47.582551
3	Starfield Retail – Omnichannel CRM	4	6	closed_won	95000.00	100	2026-03-31 00:00:00	Full omnichannel CRM for 85-store network. Signed and onboarding started.	\N	partner	Kick-off data migration sprint next Monday.	\N	\N	\N	2026-06-28 14:00:47.582551	2026-06-28 14:00:47.582551
4	BlueSky Finserv – Loan Origination CRM	5	8	discovery	55000.00	30	2026-09-30 00:00:00	Custom workflow for loan origination pipeline plus compliance dashboards.	\N	linkedin	Schedule technical demo with their dev team.	\N	\N	\N	2026-06-28 14:00:47.582551	2026-06-28 14:00:47.582551
5	GreenLeaf Agritech – Starter Pack	3	5	prospecting	18000.00	20	2026-08-31 00:00:00	15-seat starter package plus WhatsApp integration for farmer comms.	\N	inbound	Complete discovery call to qualify budget and timeline.	\N	\N	\N	2026-06-28 14:00:47.582551	2026-06-28 14:00:47.582551
6	Catalyst EduTech – B2B Partnership CRM	6	11	proposal	32000.00	55	2026-07-15 00:00:00	CRM for tracking enterprise training partnerships and renewal pipelines.	\N	inbound	Present ROI case study to CEO and board.	\N	\N	\N	2026-06-28 14:00:47.582551	2026-06-28 14:00:47.582551
7	Meridian Healthcare – Full Enterprise Expansion	2	4	prospecting	210000.00	25	2026-12-31 00:00:00	Full 1800-user enterprise rollout if pilot succeeds. Flagship deal.	\N	conference	Pilot must close first. Keep exec relationship warm.	\N	\N	\N	2026-06-28 14:00:47.582551	2026-06-28 14:00:47.582551
8	Apex Technologies – AI Insights Add-on	1	12	negotiation	28800.00	75	2026-05-31 00:00:00	AI Insights add-on upsell for 48 power users within existing Apex account.	\N	referral	Send AI feature walkthrough video and benchmark results.	\N	\N	\N	2026-06-28 14:00:47.582551	2026-06-28 14:00:47.582551
\.


--
-- Data for Name: opportunity_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.opportunity_items (id, opportunity_id, product_id, price_book_entry_id, product_name, quantity, unit_price, discount, total, created_at) FROM stdin;
\.


--
-- Data for Name: opportunity_stage_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.opportunity_stage_history (id, opportunity_id, stage, entered_at, left_at) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.order_items (id, order_id, product_id, product_name, quantity, unit_price, discount, total, created_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.orders (id, order_number, quote_id, opportunity_id, contact_id, account_id, created_by_user_id, status, subtotal, discount, tax, total, notes, order_date, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: price_book_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_book_entries (id, price_book_id, product_id, list_price, currency, use_standard_price, is_active, created_at, updated_at) FROM stdin;
1	1	1	1200.00	USD	f	t	2026-06-28 19:42:21.782192	2026-06-28 19:42:21.782192
2	1	2	480.00	USD	f	t	2026-06-28 19:42:21.782192	2026-06-28 19:42:21.782192
3	1	3	4500.00	USD	f	t	2026-06-28 19:42:21.782192	2026-06-28 19:42:21.782192
4	1	4	8000.00	USD	f	t	2026-06-28 19:42:21.782192	2026-06-28 19:42:21.782192
5	1	5	2400.00	USD	f	t	2026-06-28 19:42:21.782192	2026-06-28 19:42:21.782192
6	1	6	3200.00	USD	f	t	2026-06-28 19:42:21.782192	2026-06-28 19:42:21.782192
7	1	7	1800.00	USD	f	t	2026-06-28 19:42:21.782192	2026-06-28 19:42:21.782192
8	1	8	600.00	USD	f	t	2026-06-28 19:42:21.782192	2026-06-28 19:42:21.782192
\.


--
-- Data for Name: price_books; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.price_books (id, name, description, is_standard, is_active, created_at, updated_at) FROM stdin;
1	Standard Price Book	The standard list price for every product. Cannot be deleted.	t	t	2026-06-28 13:56:17.097362	2026-06-28 13:56:17.097362
\.


--
-- Data for Name: product_bundle_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_bundle_items (id, bundle_id, product_id, quantity, unit_price_override, discount_pct, sort_order, created_at) FROM stdin;
5	1	1	2	\N	5	0	2026-07-04 13:16:08.978043
6	1	4	1	\N	0	1	2026-07-04 13:16:08.979334
7	2	1	1	\N	0	0	2026-07-04 13:19:04.470119
8	2	6	1	\N	0	1	2026-07-04 13:19:04.473251
9	2	8	1	\N	0	2	2026-07-04 13:19:04.474614
\.


--
-- Data for Name: product_bundles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_bundles (id, name, description, bundle_discount_pct, is_active, created_at, updated_at) FROM stdin;
1	Starter Pack	Basic bundle	10	t	2026-07-04 13:15:14.988765	2026-07-04 13:16:08.953351
2	test package	\N	10	t	2026-07-04 13:15:53.613634	2026-07-04 13:19:04.463914
\.


--
-- Data for Name: product_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_rules (id, name, type, scope, conditions_met, conditions, actions, error_message, active, sort_order, created_at, updated_at) FROM stdin;
1	Max 20% Discount on Software Products	Discount	Quote	All	[{"field":"quote.discount","operator":"greater than","value":"20"}]	[{"type":"cap_discount","target":"quote.discount","value":"20"}]	Software products cannot exceed 20% discount	t	1	2026-06-28 14:00:47.689015	2026-06-28 14:00:47.689015
2	Bulk Discount: 5% off for Large Deals	Discount	Opportunity	All	[{"field":"opportunity.amount","operator":"greater than","value":"10000"}]	[{"type":"apply_discount_percent","target":"item.discount","value":"5"}]	\N	t	2	2026-06-28 14:00:47.791688	2026-06-28 14:00:47.791688
3	Require Approval: Quote Discount > 30%	Validation	Quote	Any	[{"field":"quote.discount","operator":"greater than","value":"30"}]	[{"type":"block","message":"Discounts above 30% require manager approval"}]	Discounts above 30% require manager approval	t	3	2026-06-28 14:00:47.911552	2026-06-28 14:00:47.911552
4	Alert: High-Value Opportunity Upsell	Alert	Opportunity	All	[{"field":"opportunity.amount","operator":"greater than","value":"50000"}]	[{"type":"show_message","message":"Consider adding Professional Services."}]	\N	t	4	2026-06-28 14:00:48.020141	2026-06-28 14:00:48.020141
5	Auto-Select Training when Software Added	Selection	Quote	All	[{"field":"product.category","operator":"equals","value":"Software"}]	[{"type":"add_product","target":"TRAINING-001"}]	\N	f	5	2026-06-28 14:00:48.117209	2026-06-28 14:00:48.117209
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, code, description, unit_price, currency, category, quantity_unit_of_measure, is_active, created_at, updated_at) FROM stdin;
1	CRM Pro License	CRM-PRO	Full-featured CRM license per seat/year	1200.00	USD	Software	\N	t	2026-06-28 14:00:47.554972	2026-06-28 14:00:47.554972
2	CRM Starter License	CRM-STR	Starter CRM license per seat/year	480.00	USD	Software	\N	t	2026-06-28 14:00:47.554972	2026-06-28 14:00:47.554972
3	Implementation & Onboarding	IMPL-OB	Professional services for setup and team onboarding	4500.00	USD	Services	\N	t	2026-06-28 14:00:47.554972	2026-06-28 14:00:47.554972
4	Custom Integration Package	INT-PKG	API & custom integration development	8000.00	USD	Services	\N	t	2026-06-28 14:00:47.554972	2026-06-28 14:00:47.554972
5	Priority Support (Annual)	SUP-PRI	Dedicated support channel, <2hr SLA	2400.00	USD	Support	\N	t	2026-06-28 14:00:47.554972	2026-06-28 14:00:47.554972
6	Data Migration Service	DAT-MIG	Full data migration from legacy system	3200.00	USD	Services	\N	t	2026-06-28 14:00:47.554972	2026-06-28 14:00:47.554972
7	Training Workshop (1 day)	TRN-WS	On-site or remote training workshop	1800.00	USD	Training	\N	t	2026-06-28 14:00:47.554972	2026-06-28 14:00:47.554972
8	AI Insights Add-on	AI-INS	AI-powered lead scoring and deal intelligence	600.00	USD	Software	\N	t	2026-06-28 14:00:47.554972	2026-06-28 14:00:47.554972
\.


--
-- Data for Name: quote_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quote_items (id, quote_id, product_id, price_book_entry_id, product_name, quantity, unit_price, discount, total, created_at) FROM stdin;
1	1	1	\N	CRM Pro License	72.00	1200.00	0.00	86400.00	2026-06-28 14:00:47.600345
2	1	3	\N	Implementation & Onboarding	1.00	4500.00	0.00	4500.00	2026-06-28 14:00:47.600345
3	1	4	\N	Custom Integration Package	1.00	8000.00	0.00	8000.00	2026-06-28 14:00:47.600345
4	1	5	\N	Priority Support (Annual)	1.00	2400.00	0.00	2400.00	2026-06-28 14:00:47.600345
5	1	8	\N	AI Insights Add-on	72.00	600.00	0.00	43200.00	2026-06-28 14:00:47.600345
6	2	1	\N	CRM Pro License	60.00	1200.00	0.00	72000.00	2026-06-28 14:00:47.600345
7	2	3	\N	Implementation & Onboarding	1.00	4500.00	0.00	4500.00	2026-06-28 14:00:47.600345
8	2	6	\N	Data Migration Service	1.00	3200.00	0.00	3200.00	2026-06-28 14:00:47.600345
9	2	7	\N	Training Workshop (1 day)	2.00	1800.00	0.00	3600.00	2026-06-28 14:00:47.600345
10	2	5	\N	Priority Support (Annual)	1.00	2400.00	0.00	2400.00	2026-06-28 14:00:47.600345
13	27	1	\N	CRM Pro License	2.00	1200.00	14.99	2040.24	2026-07-04 14:20:19.535045
14	27	4	\N	Custom Integration Package	1.00	8000.00	10.00	7200.00	2026-07-04 14:20:19.535045
15	28	1	\N	CRM Pro License	1.00	1200.00	10.00	1080.00	2026-07-04 14:20:27.06247
20	32	1	\N	CRM Pro License	2.00	1200.00	14.99	2040.24	2026-07-04 14:21:28.578816
21	32	4	\N	Custom Integration Package	1.00	8000.00	10.00	7200.00	2026-07-04 14:21:28.578816
22	32	\N	\N	Extra Consulting	5.00	200.00	0.00	1000.00	2026-07-04 14:21:28.578816
23	30	1	\N	CRM Pro License	5.00	1200.00	15.00	5100.00	2026-07-04 14:23:24.953975
24	30	\N	\N	Support Plan	1.00	800.00	0.00	800.00	2026-07-04 14:23:24.953975
27	31	1	\N	CRM Pro License	2.00	1200.00	14.99	2040.24	2026-07-04 14:24:14.497374
28	31	4	\N	Custom Integration Package	1.00	8000.00	10.00	7200.00	2026-07-04 14:24:14.497374
29	33	1	\N	CRM Pro License	1.00	1200.00	0.00	1200.00	2026-07-04 14:26:01.49606
30	34	1	\N	CRM Pro License	2.00	1200.00	15.00	2040.00	2026-07-04 14:26:16.214967
31	34	4	\N	Custom Integration Package	1.00	8000.00	10.00	7200.00	2026-07-04 14:26:16.214967
\.


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quotes (id, quote_number, name, version, parent_quote_id, cloned_from_quote_id, created_by_user_id, created_by_name, created_by_email, opportunity_id, contact_id, account_id, price_book_id, status, valid_until, subtotal, discount, tax, total, notes, created_at, updated_at) FROM stdin;
2	QUO-2026-0002	Starfield Retail – Omnichannel CRM (Signed)	1	\N	\N	\N	\N	\N	3	6	4	\N	accepted	2026-04-30 00:00:00	87400.00	4370.00	14882.40	97912.40	5% early-sign discount applied. Includes implementation and first-year support.	2026-06-28 14:00:47.596027	2026-06-28 14:00:47.596027
1	QUO-2026-0001	Apex Technologies – Enterprise CRM Proposal	1	\N	\N	\N	\N	\N	1	1	1	\N	accepted	2026-06-15 00:00:00	132000.00	9240.00	17283.60	140043.60	7% volume discount applied. Prices in INR equivalent billed as USD. Net 30 payment terms.	2026-06-28 14:00:47.596027	2026-06-28 18:34:07.361
21	QT-1001	Test Quote 2	1	\N	\N	\N	Dev Admin	dev@crmai.local	\N	\N	\N	1	draft	\N	0.00	0.00	0.00	0.00	\N	2026-07-04 14:09:26.64805	2026-07-04 14:09:26.64805
27	QT-1002	Bundle Quote Test	1	\N	\N	\N	Dev Admin	dev@crmai.local	\N	\N	\N	1	draft	\N	9240.24	0.00	0.00	9240.24	\N	2026-07-04 14:20:19.125781	2026-07-04 14:20:19.125781
28	QT-1003	Bundle Quote 3	1	\N	\N	\N	Dev Admin	dev@crmai.local	\N	\N	\N	1	draft	\N	1080.00	0.00	0.00	1080.00	\N	2026-07-04 14:20:27.059976	2026-07-04 14:20:27.059976
29	QT-1004	Normal Quote Empty	1	\N	\N	\N	Dev Admin	dev@crmai.local	\N	\N	\N	1	draft	\N	0.00	0.00	0.00	0.00	\N	2026-07-04 14:21:11.565227	2026-07-04 14:21:11.565227
32	QT-1007	Mixed Quote	1	\N	\N	\N	Dev Admin	dev@crmai.local	\N	\N	\N	1	draft	\N	10240.24	5.00	10.00	10701.05	\N	2026-07-04 14:21:28.576689	2026-07-04 14:21:28.576689
30	QT-1005	Normal Quote Updated	1	\N	\N	\N	Dev Admin	dev@crmai.local	\N	\N	\N	1	sent	\N	5900.00	10.00	8.00	5734.80	\N	2026-07-04 14:21:11.729747	2026-07-04 13:23:24.945
31	QT-1006	Bundle Quote - Final	1	\N	\N	\N	Dev Admin	dev@crmai.local	\N	\N	\N	1	draft	\N	9240.24	0.00	5.00	9702.25	\N	2026-07-04 14:21:28.335802	2026-07-04 13:24:14.494
33	QT-1008	test	1	\N	\N	\N	Dev Admin	dev@crmai.local	\N	\N	\N	1	draft	2026-08-08 00:00:00	1200.00	0.00	0.00	1200.00	\N	2026-07-04 14:26:01.483166	2026-07-04 14:26:01.483166
34	QT-1009	test	1	\N	\N	\N	Dev Admin	dev@crmai.local	\N	\N	\N	1	draft	2026-08-08 00:00:00	9240.00	0.00	0.00	9240.00	\N	2026-07-04 14:26:16.212066	2026-07-04 14:26:16.212066
\.


--
-- Data for Name: record_access; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.record_access (id, record_type_key, role_key, can_view, can_read_only, can_edit, can_create, can_delete, updated_by, updated_at) FROM stdin;
1	leads	admin	t	t	t	t	t	\N	2026-06-28 13:56:17.130007
2	contacts	admin	t	t	t	t	t	\N	2026-06-28 13:56:17.134607
3	accounts	admin	t	t	t	t	t	\N	2026-06-28 13:56:17.135563
4	opportunities	admin	t	t	t	t	t	\N	2026-06-28 13:56:17.136369
5	quotes	admin	t	t	t	t	t	\N	2026-06-28 13:56:17.137355
6	orders	admin	t	t	t	t	t	\N	2026-06-28 13:56:17.139132
7	activities	admin	t	t	t	t	t	\N	2026-06-28 13:56:17.140175
8	cases	admin	t	t	t	t	t	\N	2026-06-28 13:56:17.140727
9	products	admin	t	t	t	t	t	\N	2026-06-28 13:56:17.141175
10	campaigns	admin	t	t	t	t	t	\N	2026-06-28 13:56:17.141601
\.


--
-- Data for Name: record_access_audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.record_access_audit_log (id, record_type_key, role_key, previous_permissions, new_permissions, changed_by_user_id, changed_by_name, created_at) FROM stdin;
\.


--
-- Data for Name: record_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.record_types (key, name, sort_order) FROM stdin;
leads	Lead	10
contacts	Contact	20
accounts	Customer (Account)	30
opportunities	Opportunity	40
quotes	Quote	50
orders	Order	60
activities	Task / Activity	70
cases	Case	80
products	Product	90
campaigns	Campaign	100
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.roles (key, label, sort_order) FROM stdin;
super_admin	Super Administrator	5
admin	System Administrator	10
md	Managing Director	20
vp	Vice President	30
sales_director	Sales Director	40
sales_manager	Sales Manager	50
sales_rep	Sales Rep	60
\.


--
-- Data for Name: screen_access; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.screen_access (id, screen_key, role_key, access_level, updated_by, updated_at) FROM stdin;
1	dashboard	super_admin	edit	\N	2026-06-28 13:56:17.105238
2	dashboard	admin	edit	\N	2026-06-28 13:56:17.105238
3	leads	super_admin	edit	\N	2026-06-28 13:56:17.105238
4	leads	admin	edit	\N	2026-06-28 13:56:17.105238
5	contacts	super_admin	edit	\N	2026-06-28 13:56:17.105238
6	contacts	admin	edit	\N	2026-06-28 13:56:17.105238
7	accounts	super_admin	edit	\N	2026-06-28 13:56:17.105238
8	accounts	admin	edit	\N	2026-06-28 13:56:17.105238
9	opportunities	super_admin	edit	\N	2026-06-28 13:56:17.105238
10	opportunities	admin	edit	\N	2026-06-28 13:56:17.105238
11	quotes	super_admin	edit	\N	2026-06-28 13:56:17.105238
12	quotes	admin	edit	\N	2026-06-28 13:56:17.105238
13	orders	super_admin	edit	\N	2026-06-28 13:56:17.105238
14	orders	admin	edit	\N	2026-06-28 13:56:17.105238
15	contracts	super_admin	edit	\N	2026-06-28 13:56:17.105238
16	contracts	admin	edit	\N	2026-06-28 13:56:17.105238
17	activities	super_admin	edit	\N	2026-06-28 13:56:17.105238
18	activities	admin	edit	\N	2026-06-28 13:56:17.105238
19	campaigns	super_admin	edit	\N	2026-06-28 13:56:17.105238
20	campaigns	admin	edit	\N	2026-06-28 13:56:17.105238
21	website-visits	super_admin	edit	\N	2026-06-28 13:56:17.105238
22	website-visits	admin	edit	\N	2026-06-28 13:56:17.105238
23	products	super_admin	edit	\N	2026-06-28 13:56:17.105238
24	products	admin	edit	\N	2026-06-28 13:56:17.105238
25	price-books	super_admin	edit	\N	2026-06-28 13:56:17.105238
26	price-books	admin	edit	\N	2026-06-28 13:56:17.105238
27	cases	super_admin	edit	\N	2026-06-28 13:56:17.105238
28	cases	admin	edit	\N	2026-06-28 13:56:17.105238
29	reports	super_admin	edit	\N	2026-06-28 13:56:17.105238
30	reports	admin	edit	\N	2026-06-28 13:56:17.105238
31	users	super_admin	edit	\N	2026-06-28 13:56:17.105238
32	users	admin	edit	\N	2026-06-28 13:56:17.105238
33	support	super_admin	edit	\N	2026-06-28 13:56:17.105238
34	support	admin	edit	\N	2026-06-28 13:56:17.105238
35	ai-assistant	super_admin	edit	\N	2026-06-28 13:56:17.105238
36	ai-assistant	admin	edit	\N	2026-06-28 13:56:17.105238
37	approvals	super_admin	edit	\N	2026-06-28 13:56:17.105238
38	approvals	admin	edit	\N	2026-06-28 13:56:17.105238
39	access-control	super_admin	edit	\N	2026-06-28 13:56:17.105238
40	access-control	admin	edit	\N	2026-06-28 13:56:17.105238
41	dashboard	md	edit	\N	2026-06-28 13:56:17.117067
42	leads	md	edit	\N	2026-06-28 13:56:17.117067
43	contacts	md	edit	\N	2026-06-28 13:56:17.117067
44	accounts	md	edit	\N	2026-06-28 13:56:17.117067
45	opportunities	md	edit	\N	2026-06-28 13:56:17.117067
46	quotes	md	edit	\N	2026-06-28 13:56:17.117067
47	orders	md	edit	\N	2026-06-28 13:56:17.117067
48	contracts	md	edit	\N	2026-06-28 13:56:17.117067
49	activities	md	edit	\N	2026-06-28 13:56:17.117067
50	campaigns	md	edit	\N	2026-06-28 13:56:17.117067
51	website-visits	md	edit	\N	2026-06-28 13:56:17.117067
52	products	md	edit	\N	2026-06-28 13:56:17.117067
53	price-books	md	edit	\N	2026-06-28 13:56:17.117067
54	cases	md	edit	\N	2026-06-28 13:56:17.117067
55	reports	md	edit	\N	2026-06-28 13:56:17.117067
56	users	md	edit	\N	2026-06-28 13:56:17.117067
57	support	md	edit	\N	2026-06-28 13:56:17.117067
58	ai-assistant	md	edit	\N	2026-06-28 13:56:17.117067
59	dashboard	vp	edit	\N	2026-06-28 13:56:17.117067
60	leads	vp	edit	\N	2026-06-28 13:56:17.117067
61	contacts	vp	edit	\N	2026-06-28 13:56:17.117067
62	accounts	vp	edit	\N	2026-06-28 13:56:17.117067
63	opportunities	vp	edit	\N	2026-06-28 13:56:17.117067
64	quotes	vp	edit	\N	2026-06-28 13:56:17.117067
65	orders	vp	edit	\N	2026-06-28 13:56:17.117067
66	contracts	vp	edit	\N	2026-06-28 13:56:17.117067
67	activities	vp	edit	\N	2026-06-28 13:56:17.117067
68	campaigns	vp	edit	\N	2026-06-28 13:56:17.117067
69	website-visits	vp	edit	\N	2026-06-28 13:56:17.117067
70	products	vp	edit	\N	2026-06-28 13:56:17.117067
71	price-books	vp	edit	\N	2026-06-28 13:56:17.117067
72	cases	vp	edit	\N	2026-06-28 13:56:17.117067
73	reports	vp	edit	\N	2026-06-28 13:56:17.117067
74	users	vp	edit	\N	2026-06-28 13:56:17.117067
75	support	vp	edit	\N	2026-06-28 13:56:17.117067
76	ai-assistant	vp	edit	\N	2026-06-28 13:56:17.117067
77	dashboard	sales_director	edit	\N	2026-06-28 13:56:17.117067
78	leads	sales_director	edit	\N	2026-06-28 13:56:17.117067
79	contacts	sales_director	edit	\N	2026-06-28 13:56:17.117067
80	accounts	sales_director	edit	\N	2026-06-28 13:56:17.117067
81	opportunities	sales_director	edit	\N	2026-06-28 13:56:17.117067
82	quotes	sales_director	edit	\N	2026-06-28 13:56:17.117067
83	orders	sales_director	edit	\N	2026-06-28 13:56:17.117067
84	contracts	sales_director	edit	\N	2026-06-28 13:56:17.117067
85	activities	sales_director	edit	\N	2026-06-28 13:56:17.117067
86	campaigns	sales_director	edit	\N	2026-06-28 13:56:17.117067
87	website-visits	sales_director	edit	\N	2026-06-28 13:56:17.117067
88	products	sales_director	edit	\N	2026-06-28 13:56:17.117067
89	price-books	sales_director	edit	\N	2026-06-28 13:56:17.117067
90	cases	sales_director	edit	\N	2026-06-28 13:56:17.117067
91	reports	sales_director	edit	\N	2026-06-28 13:56:17.117067
92	users	sales_director	edit	\N	2026-06-28 13:56:17.117067
93	support	sales_director	edit	\N	2026-06-28 13:56:17.117067
94	ai-assistant	sales_director	edit	\N	2026-06-28 13:56:17.117067
95	dashboard	sales_manager	edit	\N	2026-06-28 13:56:17.117067
96	leads	sales_manager	edit	\N	2026-06-28 13:56:17.117067
97	contacts	sales_manager	edit	\N	2026-06-28 13:56:17.117067
98	accounts	sales_manager	edit	\N	2026-06-28 13:56:17.117067
99	opportunities	sales_manager	edit	\N	2026-06-28 13:56:17.117067
100	quotes	sales_manager	edit	\N	2026-06-28 13:56:17.117067
101	orders	sales_manager	edit	\N	2026-06-28 13:56:17.117067
102	contracts	sales_manager	edit	\N	2026-06-28 13:56:17.117067
103	activities	sales_manager	edit	\N	2026-06-28 13:56:17.117067
104	campaigns	sales_manager	edit	\N	2026-06-28 13:56:17.117067
105	website-visits	sales_manager	edit	\N	2026-06-28 13:56:17.117067
106	products	sales_manager	edit	\N	2026-06-28 13:56:17.117067
107	price-books	sales_manager	edit	\N	2026-06-28 13:56:17.117067
108	cases	sales_manager	edit	\N	2026-06-28 13:56:17.117067
109	reports	sales_manager	edit	\N	2026-06-28 13:56:17.117067
110	users	sales_manager	edit	\N	2026-06-28 13:56:17.117067
111	support	sales_manager	edit	\N	2026-06-28 13:56:17.117067
112	ai-assistant	sales_manager	edit	\N	2026-06-28 13:56:17.117067
113	dashboard	sales_rep	edit	\N	2026-06-28 13:56:17.117067
114	leads	sales_rep	edit	\N	2026-06-28 13:56:17.117067
115	contacts	sales_rep	edit	\N	2026-06-28 13:56:17.117067
116	accounts	sales_rep	edit	\N	2026-06-28 13:56:17.117067
117	opportunities	sales_rep	edit	\N	2026-06-28 13:56:17.117067
118	quotes	sales_rep	edit	\N	2026-06-28 13:56:17.117067
119	orders	sales_rep	edit	\N	2026-06-28 13:56:17.117067
120	contracts	sales_rep	edit	\N	2026-06-28 13:56:17.117067
121	activities	sales_rep	edit	\N	2026-06-28 13:56:17.117067
122	campaigns	sales_rep	view	\N	2026-06-28 13:56:17.117067
123	website-visits	sales_rep	edit	\N	2026-06-28 13:56:17.117067
124	products	sales_rep	view	\N	2026-06-28 13:56:17.117067
125	price-books	sales_rep	view	\N	2026-06-28 13:56:17.117067
127	reports	sales_rep	view	\N	2026-06-28 13:56:17.117067
128	users	sales_rep	view	\N	2026-06-28 13:56:17.117067
129	support	sales_rep	edit	\N	2026-06-28 13:56:17.117067
130	ai-assistant	sales_rep	edit	\N	2026-06-28 13:56:17.117067
2212	access-control	vp	none	0	2026-07-04 11:50:37.176
2213	access-control	sales_director	none	0	2026-07-04 11:50:37.848
2214	access-control	sales_manager	none	0	2026-07-04 11:50:38.189
2215	approvals	md	edit	0	2026-07-04 12:51:06.032609
2216	approvals	vp	edit	0	2026-07-04 12:51:06.363186
2217	approvals	sales_director	edit	0	2026-07-04 12:51:07.386794
2218	approvals	sales_manager	edit	0	2026-07-04 12:51:08.694138
2219	approvals	sales_rep	edit	0	2026-07-04 12:51:09.298282
126	cases	sales_rep	view	0	2026-07-04 11:51:22.315
2211	access-control	md	edit	0	2026-07-04 11:51:31.343
\.


--
-- Data for Name: screens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.screens (key, name, category, sort_order) FROM stdin;
dashboard	Dashboard	Overview	10
leads	Leads	Sales	20
contacts	Contacts	Sales	30
accounts	Accounts	Sales	40
opportunities	Opportunities	Sales	50
quotes	Quotes	Sales	60
orders	Orders	Sales	70
contracts	Contracts	Sales	75
activities	Activities	Engagement	80
campaigns	Campaigns	Marketing	90
website-visits	Website Visitors	Marketing	95
products	Products	Catalog	100
price-books	Price Books	Catalog	105
cases	Cases	Service	110
reports	Reports	Insights	120
users	Team & Data	Admin	130
support	Support	Service	140
ai-assistant	AI Assistant	Insights	150
approvals	Approvals	Admin	160
access-control	Access Control	Admin	170
\.


--
-- Data for Name: stims_attainment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stims_attainment (id, user_id, fiscal_period_id, actual_amount, source, updated_at) FROM stdin;
\.


--
-- Data for Name: stims_calc_runs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stims_calc_runs (id, fiscal_period_id, cycle_id, status, total_payout, approved_by, run_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stims_disputes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stims_disputes (id, payout_line_id, user_id, description, status, resolution, resolved_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stims_fiscal_periods; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stims_fiscal_periods (id, name, fiscal_year, period_type, start_date, end_date, is_locked, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stims_incentive_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stims_incentive_plans (id, name, version, status, effective_start, effective_end, currency, base_variable_split, ote_amount, payout_frequency, threshold_pct, cap_pct, measure, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stims_payout_lines; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stims_payout_lines (id, run_id, user_id, quota, actual, attainment_pct, gross_payout, adjustment, adjustment_reason, net_payout, breakdown, exception_note, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stims_plan_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stims_plan_assignments (id, plan_id, user_id, effective_start, effective_end, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stims_plan_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stims_plan_tiers (id, plan_id, label, from_pct, to_pct, rate_pct, created_at) FROM stdin;
\.


--
-- Data for Name: stims_quotas; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stims_quotas (id, cycle_id, user_id, quota_amount, ramp_pct, is_new_hire, period_breakdowns, approved, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stims_ramp_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stims_ramp_templates (id, name, months_schedule, created_at) FROM stdin;
\.


--
-- Data for Name: stims_target_cycles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.stims_target_cycles (id, name, fiscal_period_id, metric, total_target, allocation_method, scope, currency, growth_pct, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, role, team, avatar_url, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: website_visits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.website_visits (id, session_id, path, referrer, user_agent, ip_address, utm_source, utm_medium, utm_campaign, utm_content, utm_term, campaign_id, visited_at) FROM stdin;
\.


--
-- Name: access_audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.access_audit_log_id_seq', 16, true);


--
-- Name: accounts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.accounts_id_seq', 8, true);


--
-- Name: activities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activities_id_seq', 15, true);


--
-- Name: allowed_users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.allowed_users_id_seq', 1, false);


--
-- Name: approval_audit_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_audit_events_id_seq', 1, false);


--
-- Name: approval_configs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_configs_id_seq', 4, true);


--
-- Name: approval_criteria_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_criteria_id_seq', 1, false);


--
-- Name: approval_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_requests_id_seq', 1, false);


--
-- Name: approval_roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.approval_roles_id_seq', 9, true);


--
-- Name: campaign_engagements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.campaign_engagements_id_seq', 1, false);


--
-- Name: campaign_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.campaign_members_id_seq', 1, false);


--
-- Name: campaigns_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.campaigns_id_seq', 1, false);


--
-- Name: cases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.cases_id_seq', 1, false);


--
-- Name: clm_notification_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clm_notification_rules_id_seq', 1, false);


--
-- Name: clm_redlines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clm_redlines_id_seq', 1, false);


--
-- Name: clm_reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clm_reviews_id_seq', 1, false);


--
-- Name: clm_signers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clm_signers_id_seq', 1, true);


--
-- Name: clm_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clm_templates_id_seq', 2, true);


--
-- Name: clm_workflow_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clm_workflow_rules_id_seq', 1, false);


--
-- Name: contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contacts_id_seq', 12, true);


--
-- Name: contract_documents_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contract_documents_id_seq', 9, true);


--
-- Name: contract_line_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contract_line_items_id_seq', 33, true);


--
-- Name: contracts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.contracts_id_seq', 22, true);


--
-- Name: email_attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_attachments_id_seq', 1, false);


--
-- Name: email_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_settings_id_seq', 1, false);


--
-- Name: email_tracking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.email_tracking_id_seq', 1, false);


--
-- Name: emails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.emails_id_seq', 1, false);


--
-- Name: enquiries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.enquiries_id_seq', 1, false);


--
-- Name: entity_notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.entity_notes_id_seq', 14, true);


--
-- Name: lead_contacts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lead_contacts_id_seq', 1, false);


--
-- Name: lead_insights_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lead_insights_id_seq', 1, false);


--
-- Name: lead_score_milestones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lead_score_milestones_id_seq', 4, true);


--
-- Name: lead_scoring_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.lead_scoring_rules_id_seq', 32, true);


--
-- Name: leads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leads_id_seq', 10, true);


--
-- Name: opportunities_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.opportunities_id_seq', 8, true);


--
-- Name: opportunity_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.opportunity_items_id_seq', 1, false);


--
-- Name: opportunity_stage_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.opportunity_stage_history_id_seq', 1, false);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.order_items_id_seq', 1, false);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.orders_id_seq', 1, false);


--
-- Name: price_book_entries_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.price_book_entries_id_seq', 8, true);


--
-- Name: price_books_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.price_books_id_seq', 1, true);


--
-- Name: product_bundle_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_bundle_items_id_seq', 9, true);


--
-- Name: product_bundles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_bundles_id_seq', 2, true);


--
-- Name: product_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_rules_id_seq', 5, true);


--
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 8, true);


--
-- Name: quote_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quote_items_id_seq', 31, true);


--
-- Name: quotes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.quotes_id_seq', 34, true);


--
-- Name: record_access_audit_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.record_access_audit_log_id_seq', 1, false);


--
-- Name: record_access_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.record_access_id_seq', 250, true);


--
-- Name: screen_access_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.screen_access_id_seq', 3259, true);


--
-- Name: stims_attainment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stims_attainment_id_seq', 1, false);


--
-- Name: stims_calc_runs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stims_calc_runs_id_seq', 1, false);


--
-- Name: stims_disputes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stims_disputes_id_seq', 1, false);


--
-- Name: stims_fiscal_periods_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stims_fiscal_periods_id_seq', 1, false);


--
-- Name: stims_incentive_plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stims_incentive_plans_id_seq', 1, false);


--
-- Name: stims_payout_lines_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stims_payout_lines_id_seq', 1, false);


--
-- Name: stims_plan_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stims_plan_assignments_id_seq', 1, false);


--
-- Name: stims_plan_tiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stims_plan_tiers_id_seq', 1, false);


--
-- Name: stims_quotas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stims_quotas_id_seq', 1, false);


--
-- Name: stims_ramp_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stims_ramp_templates_id_seq', 1, false);


--
-- Name: stims_target_cycles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.stims_target_cycles_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 1, false);


--
-- Name: website_visits_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.website_visits_id_seq', 1, false);


--
-- Name: access_audit_log access_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.access_audit_log
    ADD CONSTRAINT access_audit_log_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: activities activities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);


--
-- Name: allowed_users allowed_users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allowed_users
    ADD CONSTRAINT allowed_users_email_unique UNIQUE (email);


--
-- Name: allowed_users allowed_users_google_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allowed_users
    ADD CONSTRAINT allowed_users_google_id_unique UNIQUE (google_id);


--
-- Name: allowed_users allowed_users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.allowed_users
    ADD CONSTRAINT allowed_users_pkey PRIMARY KEY (id);


--
-- Name: app_modules app_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_modules
    ADD CONSTRAINT app_modules_pkey PRIMARY KEY (key);


--
-- Name: approval_audit_events approval_audit_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_audit_events
    ADD CONSTRAINT approval_audit_events_pkey PRIMARY KEY (id);


--
-- Name: approval_configs approval_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_configs
    ADD CONSTRAINT approval_configs_pkey PRIMARY KEY (id);


--
-- Name: approval_criteria approval_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_criteria
    ADD CONSTRAINT approval_criteria_pkey PRIMARY KEY (id);


--
-- Name: approval_requests approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_pkey PRIMARY KEY (id);


--
-- Name: approval_roles approval_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_roles
    ADD CONSTRAINT approval_roles_pkey PRIMARY KEY (id);


--
-- Name: campaign_engagements campaign_engagements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_engagements
    ADD CONSTRAINT campaign_engagements_pkey PRIMARY KEY (id);


--
-- Name: campaign_members campaign_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: cases cases_case_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_case_number_unique UNIQUE (case_number);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: clm_notification_rules clm_notification_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clm_notification_rules
    ADD CONSTRAINT clm_notification_rules_pkey PRIMARY KEY (id);


--
-- Name: clm_redlines clm_redlines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clm_redlines
    ADD CONSTRAINT clm_redlines_pkey PRIMARY KEY (id);


--
-- Name: clm_reviews clm_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clm_reviews
    ADD CONSTRAINT clm_reviews_pkey PRIMARY KEY (id);


--
-- Name: clm_signers clm_signers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clm_signers
    ADD CONSTRAINT clm_signers_pkey PRIMARY KEY (id);


--
-- Name: clm_templates clm_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clm_templates
    ADD CONSTRAINT clm_templates_pkey PRIMARY KEY (id);


--
-- Name: clm_workflow_rules clm_workflow_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clm_workflow_rules
    ADD CONSTRAINT clm_workflow_rules_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: contract_documents contract_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_pkey PRIMARY KEY (id);


--
-- Name: contract_line_items contract_line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_line_items
    ADD CONSTRAINT contract_line_items_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_contract_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_contract_number_unique UNIQUE (contract_number);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: email_attachments email_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_pkey PRIMARY KEY (id);


--
-- Name: email_attachments email_attachments_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_token_unique UNIQUE (token);


--
-- Name: email_settings email_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_settings
    ADD CONSTRAINT email_settings_pkey PRIMARY KEY (id);


--
-- Name: email_tracking email_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_tracking
    ADD CONSTRAINT email_tracking_pkey PRIMARY KEY (id);


--
-- Name: email_tracking email_tracking_token_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_tracking
    ADD CONSTRAINT email_tracking_token_unique UNIQUE (token);


--
-- Name: emails emails_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emails
    ADD CONSTRAINT emails_pkey PRIMARY KEY (id);


--
-- Name: enquiries enquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enquiries
    ADD CONSTRAINT enquiries_pkey PRIMARY KEY (id);


--
-- Name: entity_notes entity_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_notes
    ADD CONSTRAINT entity_notes_pkey PRIMARY KEY (id);


--
-- Name: lead_contacts lead_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_contacts
    ADD CONSTRAINT lead_contacts_pkey PRIMARY KEY (id);


--
-- Name: lead_insights lead_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_insights
    ADD CONSTRAINT lead_insights_pkey PRIMARY KEY (id);


--
-- Name: lead_score_milestones lead_score_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_score_milestones
    ADD CONSTRAINT lead_score_milestones_pkey PRIMARY KEY (id);


--
-- Name: lead_scoring_rules lead_scoring_rules_key_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_scoring_rules
    ADD CONSTRAINT lead_scoring_rules_key_unique UNIQUE (key);


--
-- Name: lead_scoring_rules lead_scoring_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_scoring_rules
    ADD CONSTRAINT lead_scoring_rules_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: opportunities opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_pkey PRIMARY KEY (id);


--
-- Name: opportunity_items opportunity_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_items
    ADD CONSTRAINT opportunity_items_pkey PRIMARY KEY (id);


--
-- Name: opportunity_stage_history opportunity_stage_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_stage_history
    ADD CONSTRAINT opportunity_stage_history_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: price_book_entries price_book_entries_book_product_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_book_entries
    ADD CONSTRAINT price_book_entries_book_product_unique UNIQUE (price_book_id, product_id);


--
-- Name: price_book_entries price_book_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_book_entries
    ADD CONSTRAINT price_book_entries_pkey PRIMARY KEY (id);


--
-- Name: price_books price_books_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_books
    ADD CONSTRAINT price_books_pkey PRIMARY KEY (id);


--
-- Name: product_bundle_items product_bundle_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_bundle_items
    ADD CONSTRAINT product_bundle_items_pkey PRIMARY KEY (id);


--
-- Name: product_bundles product_bundles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_bundles
    ADD CONSTRAINT product_bundles_pkey PRIMARY KEY (id);


--
-- Name: product_rules product_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_rules
    ADD CONSTRAINT product_rules_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_quote_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_quote_number_unique UNIQUE (quote_number);


--
-- Name: record_access_audit_log record_access_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_access_audit_log
    ADD CONSTRAINT record_access_audit_log_pkey PRIMARY KEY (id);


--
-- Name: record_access record_access_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_access
    ADD CONSTRAINT record_access_pkey PRIMARY KEY (id);


--
-- Name: record_types record_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_types
    ADD CONSTRAINT record_types_pkey PRIMARY KEY (key);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (key);


--
-- Name: screen_access screen_access_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screen_access
    ADD CONSTRAINT screen_access_pkey PRIMARY KEY (id);


--
-- Name: screens screens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screens
    ADD CONSTRAINT screens_pkey PRIMARY KEY (key);


--
-- Name: stims_attainment stims_attainment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_attainment
    ADD CONSTRAINT stims_attainment_pkey PRIMARY KEY (id);


--
-- Name: stims_attainment stims_attainment_user_id_fiscal_period_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_attainment
    ADD CONSTRAINT stims_attainment_user_id_fiscal_period_id_key UNIQUE (user_id, fiscal_period_id);


--
-- Name: stims_calc_runs stims_calc_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_calc_runs
    ADD CONSTRAINT stims_calc_runs_pkey PRIMARY KEY (id);


--
-- Name: stims_disputes stims_disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_disputes
    ADD CONSTRAINT stims_disputes_pkey PRIMARY KEY (id);


--
-- Name: stims_fiscal_periods stims_fiscal_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_fiscal_periods
    ADD CONSTRAINT stims_fiscal_periods_pkey PRIMARY KEY (id);


--
-- Name: stims_incentive_plans stims_incentive_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_incentive_plans
    ADD CONSTRAINT stims_incentive_plans_pkey PRIMARY KEY (id);


--
-- Name: stims_payout_lines stims_payout_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_payout_lines
    ADD CONSTRAINT stims_payout_lines_pkey PRIMARY KEY (id);


--
-- Name: stims_plan_assignments stims_plan_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_plan_assignments
    ADD CONSTRAINT stims_plan_assignments_pkey PRIMARY KEY (id);


--
-- Name: stims_plan_assignments stims_plan_assignments_plan_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_plan_assignments
    ADD CONSTRAINT stims_plan_assignments_plan_id_user_id_key UNIQUE (plan_id, user_id);


--
-- Name: stims_plan_tiers stims_plan_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_plan_tiers
    ADD CONSTRAINT stims_plan_tiers_pkey PRIMARY KEY (id);


--
-- Name: stims_quotas stims_quotas_cycle_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_quotas
    ADD CONSTRAINT stims_quotas_cycle_id_user_id_key UNIQUE (cycle_id, user_id);


--
-- Name: stims_quotas stims_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_quotas
    ADD CONSTRAINT stims_quotas_pkey PRIMARY KEY (id);


--
-- Name: stims_ramp_templates stims_ramp_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_ramp_templates
    ADD CONSTRAINT stims_ramp_templates_pkey PRIMARY KEY (id);


--
-- Name: stims_target_cycles stims_target_cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_target_cycles
    ADD CONSTRAINT stims_target_cycles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: website_visits website_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.website_visits
    ADD CONSTRAINT website_visits_pkey PRIMARY KEY (id);


--
-- Name: approval_audit_events_request_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX approval_audit_events_request_idx ON public.approval_audit_events USING btree (request_id);


--
-- Name: approval_configs_entity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX approval_configs_entity_idx ON public.approval_configs USING btree (entity);


--
-- Name: approval_requests_entity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX approval_requests_entity_idx ON public.approval_requests USING btree (entity, entity_id);


--
-- Name: approval_requests_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX approval_requests_status_idx ON public.approval_requests USING btree (status);


--
-- Name: approval_roles_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX approval_roles_name_idx ON public.approval_roles USING btree (name);


--
-- Name: ce_campaign_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ce_campaign_id_idx ON public.campaign_engagements USING btree (campaign_id);


--
-- Name: ce_lead_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ce_lead_id_idx ON public.campaign_engagements USING btree (lead_id);


--
-- Name: ce_occurred_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ce_occurred_at_idx ON public.campaign_engagements USING btree (occurred_at);


--
-- Name: ce_platform_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ce_platform_idx ON public.campaign_engagements USING btree (platform);


--
-- Name: contract_documents_contract_version_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX contract_documents_contract_version_unique ON public.contract_documents USING btree (contract_id, version);


--
-- Name: email_attachments_tracking_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX email_attachments_tracking_id_idx ON public.email_attachments USING btree (tracking_id);


--
-- Name: email_tracking_message_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX email_tracking_message_id_idx ON public.email_tracking USING btree (message_id);


--
-- Name: emails_message_uid_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX emails_message_uid_unique ON public.emails USING btree (message_uid);


--
-- Name: entity_notes_entity_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX entity_notes_entity_idx ON public.entity_notes USING btree (entity_type, entity_id);


--
-- Name: oppstagehist_opp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX oppstagehist_opp_idx ON public.opportunity_stage_history USING btree (opportunity_id);


--
-- Name: price_books_single_standard_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX price_books_single_standard_unique ON public.price_books USING btree (is_standard) WHERE (is_standard = true);


--
-- Name: record_access_type_role_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX record_access_type_role_unique ON public.record_access USING btree (record_type_key, role_key);


--
-- Name: screen_access_screen_role_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX screen_access_screen_role_unique ON public.screen_access USING btree (screen_key, role_key);


--
-- Name: website_visits_session_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX website_visits_session_id_idx ON public.website_visits USING btree (session_id);


--
-- Name: website_visits_visited_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX website_visits_visited_at_idx ON public.website_visits USING btree (visited_at);


--
-- Name: accounts accounts_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: accounts accounts_modified_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_modified_by_users_id_fk FOREIGN KEY (modified_by) REFERENCES public.users(id);


--
-- Name: accounts accounts_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: activities activities_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: activities activities_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: activities activities_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: activities activities_lead_id_leads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_lead_id_leads_id_fk FOREIGN KEY (lead_id) REFERENCES public.leads(id);


--
-- Name: activities activities_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: approval_audit_events approval_audit_events_actor_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_audit_events
    ADD CONSTRAINT approval_audit_events_actor_user_id_users_id_fk FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: approval_audit_events approval_audit_events_request_id_approval_requests_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_audit_events
    ADD CONSTRAINT approval_audit_events_request_id_approval_requests_id_fk FOREIGN KEY (request_id) REFERENCES public.approval_requests(id) ON DELETE CASCADE;


--
-- Name: approval_criteria approval_criteria_role_id_approval_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_criteria
    ADD CONSTRAINT approval_criteria_role_id_approval_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.approval_roles(id) ON DELETE SET NULL;


--
-- Name: approval_requests approval_requests_criterion_id_approval_criteria_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_criterion_id_approval_criteria_id_fk FOREIGN KEY (criterion_id) REFERENCES public.approval_criteria(id) ON DELETE SET NULL;


--
-- Name: approval_requests approval_requests_decided_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_decided_by_users_id_fk FOREIGN KEY (decided_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: approval_requests approval_requests_requested_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_requested_by_users_id_fk FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: approval_requests approval_requests_role_id_approval_roles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approval_requests
    ADD CONSTRAINT approval_requests_role_id_approval_roles_id_fk FOREIGN KEY (role_id) REFERENCES public.approval_roles(id) ON DELETE SET NULL;


--
-- Name: campaign_engagements campaign_engagements_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_engagements
    ADD CONSTRAINT campaign_engagements_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: campaign_engagements campaign_engagements_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_engagements
    ADD CONSTRAINT campaign_engagements_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: campaign_engagements campaign_engagements_lead_id_leads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_engagements
    ADD CONSTRAINT campaign_engagements_lead_id_leads_id_fk FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: campaign_members campaign_members_added_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_added_by_users_id_fk FOREIGN KEY (added_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: campaign_members campaign_members_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: campaign_members campaign_members_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: campaign_members campaign_members_lead_id_leads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.campaign_members
    ADD CONSTRAINT campaign_members_lead_id_leads_id_fk FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;


--
-- Name: cases cases_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: cases cases_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: cases cases_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: contacts contacts_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: contacts contacts_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: contract_documents contract_documents_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id);


--
-- Name: contract_documents contract_documents_created_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_documents
    ADD CONSTRAINT contract_documents_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: contract_line_items contract_line_items_contract_id_contracts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_line_items
    ADD CONSTRAINT contract_line_items_contract_id_contracts_id_fk FOREIGN KEY (contract_id) REFERENCES public.contracts(id);


--
-- Name: contract_line_items contract_line_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contract_line_items
    ADD CONSTRAINT contract_line_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: contracts contracts_company_signed_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_company_signed_by_id_users_id_fk FOREIGN KEY (company_signed_by_id) REFERENCES public.users(id);


--
-- Name: contracts contracts_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: contracts contracts_created_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: contracts contracts_customer_signed_by_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_customer_signed_by_contact_id_contacts_id_fk FOREIGN KEY (customer_signed_by_contact_id) REFERENCES public.contacts(id);


--
-- Name: contracts contracts_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: contracts contracts_owner_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_owner_id_users_id_fk FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: contracts contracts_price_book_id_price_books_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_price_book_id_price_books_id_fk FOREIGN KEY (price_book_id) REFERENCES public.price_books(id) ON DELETE SET NULL;


--
-- Name: email_attachments email_attachments_tracking_id_email_tracking_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_tracking_id_email_tracking_id_fk FOREIGN KEY (tracking_id) REFERENCES public.email_tracking(id) ON DELETE CASCADE;


--
-- Name: email_tracking email_tracking_activity_id_activities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_tracking
    ADD CONSTRAINT email_tracking_activity_id_activities_id_fk FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: entity_notes entity_notes_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_notes
    ADD CONSTRAINT entity_notes_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: lead_contacts lead_contacts_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_contacts
    ADD CONSTRAINT lead_contacts_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: lead_contacts lead_contacts_lead_id_leads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_contacts
    ADD CONSTRAINT lead_contacts_lead_id_leads_id_fk FOREIGN KEY (lead_id) REFERENCES public.leads(id);


--
-- Name: lead_insights lead_insights_lead_id_leads_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lead_insights
    ADD CONSTRAINT lead_insights_lead_id_leads_id_fk FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;


--
-- Name: leads leads_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: leads leads_converted_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_converted_account_id_accounts_id_fk FOREIGN KEY (converted_account_id) REFERENCES public.accounts(id);


--
-- Name: leads leads_converted_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_converted_contact_id_contacts_id_fk FOREIGN KEY (converted_contact_id) REFERENCES public.contacts(id);


--
-- Name: opportunities opportunities_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: opportunities opportunities_assigned_to_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_assigned_to_users_id_fk FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: opportunities opportunities_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: opportunities opportunities_price_book_id_price_books_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_price_book_id_price_books_id_fk FOREIGN KEY (price_book_id) REFERENCES public.price_books(id) ON DELETE SET NULL;


--
-- Name: opportunity_items opportunity_items_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_items
    ADD CONSTRAINT opportunity_items_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: opportunity_items opportunity_items_price_book_entry_id_price_book_entries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_items
    ADD CONSTRAINT opportunity_items_price_book_entry_id_price_book_entries_id_fk FOREIGN KEY (price_book_entry_id) REFERENCES public.price_book_entries(id) ON DELETE SET NULL;


--
-- Name: opportunity_items opportunity_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_items
    ADD CONSTRAINT opportunity_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: opportunity_stage_history opportunity_stage_history_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.opportunity_stage_history
    ADD CONSTRAINT opportunity_stage_history_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: orders orders_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: orders orders_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: orders orders_created_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: orders orders_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: orders orders_quote_id_quotes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_quote_id_quotes_id_fk FOREIGN KEY (quote_id) REFERENCES public.quotes(id);


--
-- Name: price_book_entries price_book_entries_price_book_id_price_books_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_book_entries
    ADD CONSTRAINT price_book_entries_price_book_id_price_books_id_fk FOREIGN KEY (price_book_id) REFERENCES public.price_books(id);


--
-- Name: price_book_entries price_book_entries_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.price_book_entries
    ADD CONSTRAINT price_book_entries_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: product_bundle_items product_bundle_items_bundle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_bundle_items
    ADD CONSTRAINT product_bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.product_bundles(id) ON DELETE CASCADE;


--
-- Name: product_bundle_items product_bundle_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_bundle_items
    ADD CONSTRAINT product_bundle_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: quote_items quote_items_price_book_entry_id_price_book_entries_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_price_book_entry_id_price_book_entries_id_fk FOREIGN KEY (price_book_entry_id) REFERENCES public.price_book_entries(id) ON DELETE SET NULL;


--
-- Name: quote_items quote_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: quote_items quote_items_quote_id_quotes_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_quote_id_quotes_id_fk FOREIGN KEY (quote_id) REFERENCES public.quotes(id);


--
-- Name: quotes quotes_account_id_accounts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_account_id_accounts_id_fk FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: quotes quotes_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: quotes quotes_created_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_created_by_user_id_users_id_fk FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);


--
-- Name: quotes quotes_opportunity_id_opportunities_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_opportunity_id_opportunities_id_fk FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: quotes quotes_price_book_id_price_books_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_price_book_id_price_books_id_fk FOREIGN KEY (price_book_id) REFERENCES public.price_books(id) ON DELETE SET NULL;


--
-- Name: record_access record_access_record_type_key_record_types_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.record_access
    ADD CONSTRAINT record_access_record_type_key_record_types_key_fk FOREIGN KEY (record_type_key) REFERENCES public.record_types(key) ON DELETE CASCADE;


--
-- Name: screen_access screen_access_role_key_roles_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screen_access
    ADD CONSTRAINT screen_access_role_key_roles_key_fk FOREIGN KEY (role_key) REFERENCES public.roles(key) ON DELETE CASCADE;


--
-- Name: screen_access screen_access_screen_key_screens_key_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.screen_access
    ADD CONSTRAINT screen_access_screen_key_screens_key_fk FOREIGN KEY (screen_key) REFERENCES public.screens(key) ON DELETE CASCADE;


--
-- Name: stims_attainment stims_attainment_fiscal_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_attainment
    ADD CONSTRAINT stims_attainment_fiscal_period_id_fkey FOREIGN KEY (fiscal_period_id) REFERENCES public.stims_fiscal_periods(id) ON DELETE SET NULL;


--
-- Name: stims_calc_runs stims_calc_runs_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_calc_runs
    ADD CONSTRAINT stims_calc_runs_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.stims_target_cycles(id) ON DELETE SET NULL;


--
-- Name: stims_calc_runs stims_calc_runs_fiscal_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_calc_runs
    ADD CONSTRAINT stims_calc_runs_fiscal_period_id_fkey FOREIGN KEY (fiscal_period_id) REFERENCES public.stims_fiscal_periods(id) ON DELETE SET NULL;


--
-- Name: stims_disputes stims_disputes_payout_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_disputes
    ADD CONSTRAINT stims_disputes_payout_line_id_fkey FOREIGN KEY (payout_line_id) REFERENCES public.stims_payout_lines(id) ON DELETE SET NULL;


--
-- Name: stims_payout_lines stims_payout_lines_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_payout_lines
    ADD CONSTRAINT stims_payout_lines_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.stims_calc_runs(id) ON DELETE CASCADE;


--
-- Name: stims_plan_assignments stims_plan_assignments_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_plan_assignments
    ADD CONSTRAINT stims_plan_assignments_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.stims_incentive_plans(id) ON DELETE CASCADE;


--
-- Name: stims_plan_tiers stims_plan_tiers_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_plan_tiers
    ADD CONSTRAINT stims_plan_tiers_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.stims_incentive_plans(id) ON DELETE CASCADE;


--
-- Name: stims_quotas stims_quotas_cycle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_quotas
    ADD CONSTRAINT stims_quotas_cycle_id_fkey FOREIGN KEY (cycle_id) REFERENCES public.stims_target_cycles(id) ON DELETE CASCADE;


--
-- Name: stims_target_cycles stims_target_cycles_fiscal_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stims_target_cycles
    ADD CONSTRAINT stims_target_cycles_fiscal_period_id_fkey FOREIGN KEY (fiscal_period_id) REFERENCES public.stims_fiscal_periods(id) ON DELETE SET NULL;


--
-- Schema changes applied after 2026-07-04 dump
-- These DDL statements are idempotent and safe to re-run.
--

-- users: org_id column (added to support multi-org)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS org_id integer NOT NULL DEFAULT 1;

-- products: cost_price and quantity_unit_of_measure columns
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price numeric;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS quantity_unit_of_measure text;

-- quote_items: cost_price, margin_pct, bundle_id, bundle_name columns
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS cost_price numeric;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS margin_pct numeric;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS bundle_id integer;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS bundle_name text;

-- price_book_entries: use_standard_price column
ALTER TABLE public.price_book_entries ADD COLUMN IF NOT EXISTS use_standard_price boolean NOT NULL DEFAULT false;

-- admin_settings: key-value store for system config (CPQ toggle, email, etc.)
CREATE TABLE IF NOT EXISTS public.admin_settings (
    key text PRIMARY KEY,
    value text NOT NULL DEFAULT '',
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- product_rules: validation and alert rules for products on quotes
CREATE TABLE IF NOT EXISTS public.product_rules (
    id integer NOT NULL DEFAULT nextval('public.product_rules_id_seq'::regclass),
    name text NOT NULL,
    type text NOT NULL,
    scope text NOT NULL DEFAULT 'Product',
    conditions_met text NOT NULL DEFAULT 'All',
    conditions text NOT NULL DEFAULT '[]',
    actions text NOT NULL DEFAULT '[]',
    error_message text,
    active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.product_rules_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.product_rules_id_seq OWNED BY public.product_rules.id;

-- product_bundles: named collections of products with a bundle discount
CREATE TABLE IF NOT EXISTS public.product_bundles (
    id integer NOT NULL DEFAULT nextval('public.product_bundles_id_seq'::regclass),
    name text NOT NULL,
    description text,
    bundle_discount_pct numeric NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.product_bundles_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.product_bundles_id_seq OWNED BY public.product_bundles.id;

-- product_bundle_items: line items within a bundle
CREATE TABLE IF NOT EXISTS public.product_bundle_items (
    id integer NOT NULL DEFAULT nextval('public.product_bundle_items_id_seq'::regclass),
    bundle_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric NOT NULL DEFAULT 1,
    unit_price_override numeric,
    discount_pct numeric NOT NULL DEFAULT 0,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.product_bundle_items_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.product_bundle_items_id_seq OWNED BY public.product_bundle_items.id;
ALTER TABLE ONLY public.product_bundle_items
    ADD CONSTRAINT product_bundle_items_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.product_bundles(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.product_bundle_items
    ADD CONSTRAINT product_bundle_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

-- quote_attachments: file attachments stored as base64 against a quote
CREATE TABLE IF NOT EXISTS public.quote_attachments (
    id integer NOT NULL DEFAULT nextval('public.quote_attachments_id_seq'::regclass),
    quote_id integer NOT NULL,
    file_name text NOT NULL,
    file_size integer NOT NULL DEFAULT 0,
    file_type text NOT NULL DEFAULT '',
    file_data text NOT NULL,
    uploaded_by_name text,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.quote_attachments_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.quote_attachments_id_seq OWNED BY public.quote_attachments.id;
ALTER TABLE ONLY public.quote_attachments
    ADD CONSTRAINT quote_attachments_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS qa_quote_id_idx ON public.quote_attachments(quote_id);

-- quote_team_members: internal employees assigned to work on a quote
CREATE TABLE IF NOT EXISTS public.quote_team_members (
    id integer NOT NULL DEFAULT nextval('public.quote_team_members_id_seq'::regclass),
    quote_id integer NOT NULL,
    user_id integer NOT NULL,
    role text NOT NULL DEFAULT 'Team Member',
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT quote_team_members_quote_user_unique UNIQUE (quote_id, user_id)
);
CREATE SEQUENCE IF NOT EXISTS public.quote_team_members_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.quote_team_members_id_seq OWNED BY public.quote_team_members.id;
ALTER TABLE ONLY public.quote_team_members
    ADD CONSTRAINT quote_team_members_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.quote_team_members
    ADD CONSTRAINT quote_team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS qtm_quote_id_idx ON public.quote_team_members(quote_id);

-- social_messages: inbound/outbound messages across social platforms
CREATE TABLE IF NOT EXISTS public.social_messages (
    id integer NOT NULL DEFAULT nextval('public.social_messages_id_seq'::regclass),
    lead_id integer,
    contact_id integer,
    sent_by_user_id integer,
    platform text NOT NULL,
    direction text NOT NULL,
    content text NOT NULL,
    media_url text,
    media_type text,
    sender_name text,
    sender_handle text,
    sender_avatar_url text,
    platform_message_id text,
    platform_thread_id text,
    platform_profile_url text,
    status text NOT NULL DEFAULT 'sent',
    is_read boolean NOT NULL DEFAULT false,
    delivered_at timestamp without time zone,
    read_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.social_messages_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.social_messages_id_seq OWNED BY public.social_messages.id;
CREATE INDEX IF NOT EXISTS sm_lead_id_idx ON public.social_messages(lead_id);
CREATE INDEX IF NOT EXISTS sm_platform_idx ON public.social_messages(platform);
CREATE INDEX IF NOT EXISTS sm_created_at_idx ON public.social_messages(created_at);

-- app_modules: toggleable feature modules (quotes, orders, contracts, CPQ)
CREATE TABLE IF NOT EXISTS public.app_modules (
    key text PRIMARY KEY,
    label text NOT NULL,
    description text NOT NULL DEFAULT '',
    is_enabled boolean NOT NULL DEFAULT true,
    is_core boolean NOT NULL DEFAULT false,
    sort_order integer NOT NULL DEFAULT 100,
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);

-- lead_attachments: file attachments against leads
CREATE TABLE IF NOT EXISTS public.lead_attachments (
    id integer NOT NULL DEFAULT nextval('public.lead_attachments_id_seq'::regclass),
    lead_id integer NOT NULL,
    file_name text NOT NULL,
    file_size integer NOT NULL DEFAULT 0,
    file_type text NOT NULL DEFAULT '',
    file_data text NOT NULL,
    uploaded_by_name text,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.lead_attachments_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.lead_attachments_id_seq OWNED BY public.lead_attachments.id;
ALTER TABLE ONLY public.lead_attachments
    ADD CONSTRAINT lead_attachments_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS la_lead_id_idx ON public.lead_attachments(lead_id);

-- opportunity_attachments: file attachments against opportunities
CREATE TABLE IF NOT EXISTS public.opportunity_attachments (
    id integer NOT NULL DEFAULT nextval('public.opportunity_attachments_id_seq'::regclass),
    opportunity_id integer NOT NULL,
    file_name text NOT NULL,
    file_size integer NOT NULL DEFAULT 0,
    file_type text NOT NULL DEFAULT '',
    file_data text NOT NULL,
    uploaded_by_name text,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.opportunity_attachments_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.opportunity_attachments_id_seq OWNED BY public.opportunity_attachments.id;
ALTER TABLE ONLY public.opportunity_attachments
    ADD CONSTRAINT opportunity_attachments_opp_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS oa_opp_id_idx ON public.opportunity_attachments(opportunity_id);

--
-- CLM column extensions on contracts table
--
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS contract_type text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS territory text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS business_unit text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium';
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS governing_law text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS liability_cap_multiplier numeric;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS confidentiality_period_years integer;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS ip_ownership text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS termination_notice_days integer;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS counterparty_company text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS counterparty_signer_name text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS counterparty_signer_email text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS counterparty_signer_title text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS counterparty_address text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signing_provider text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signing_order text DEFAULT 'Sequential';
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signing_deadline date;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS renewal_status text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS renewal_decision_date date;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS renewal_window_days integer DEFAULT 90;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS arr_at_risk numeric;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS yearly_escalation_pct numeric;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS minimum_annual_commit numeric;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS risk_score integer;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS redline_round integer DEFAULT 0;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS template_id integer;

-- clm_templates: reusable contract templates
CREATE TABLE IF NOT EXISTS public.clm_templates (
    id integer NOT NULL DEFAULT nextval('public.clm_templates_id_seq'::regclass),
    name text NOT NULL,
    category text NOT NULL DEFAULT 'MSA',
    description text,
    content text,
    variables text NOT NULL DEFAULT '[]',
    active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.clm_templates_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.clm_templates_id_seq OWNED BY public.clm_templates.id;

-- clm_reviews: review stages per contract
CREATE TABLE IF NOT EXISTS public.clm_reviews (
    id integer NOT NULL DEFAULT nextval('public.clm_reviews_id_seq'::regclass),
    contract_id integer NOT NULL,
    reviewer_id integer,
    stage text NOT NULL DEFAULT 'legal',
    status text NOT NULL DEFAULT 'pending',
    decision text,
    due_date date,
    decision_date date,
    notes text,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.clm_reviews_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.clm_reviews_id_seq OWNED BY public.clm_reviews.id;

-- clm_signers: counterparty signers for e-signature workflows
CREATE TABLE IF NOT EXISTS public.clm_signers (
    id integer NOT NULL DEFAULT nextval('public.clm_signers_id_seq'::regclass),
    contract_id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    title text,
    role text NOT NULL DEFAULT 'signer',
    signing_order integer NOT NULL DEFAULT 1,
    party text NOT NULL DEFAULT 'counterparty',
    status text NOT NULL DEFAULT 'pending',
    signed_at timestamp without time zone,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.clm_signers_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.clm_signers_id_seq OWNED BY public.clm_signers.id;

-- clm_redlines: tracked changes during contract negotiation
CREATE TABLE IF NOT EXISTS public.clm_redlines (
    id integer NOT NULL DEFAULT nextval('public.clm_redlines_id_seq'::regclass),
    contract_id integer NOT NULL,
    author_id integer,
    round integer NOT NULL DEFAULT 1,
    section text,
    original_text text,
    proposed_text text,
    change_type text NOT NULL DEFAULT 'modification',
    party text NOT NULL DEFAULT 'counterparty',
    status text NOT NULL DEFAULT 'open',
    notes text,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.clm_redlines_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.clm_redlines_id_seq OWNED BY public.clm_redlines.id;

-- clm_workflow_rules: automation rules triggered by CLM events
CREATE TABLE IF NOT EXISTS public.clm_workflow_rules (
    id integer NOT NULL DEFAULT nextval('public.clm_workflow_rules_id_seq'::regclass),
    name text NOT NULL,
    trigger_event text NOT NULL,
    conditions text NOT NULL DEFAULT '[]',
    actions text NOT NULL DEFAULT '[]',
    active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.clm_workflow_rules_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.clm_workflow_rules_id_seq OWNED BY public.clm_workflow_rules.id;

-- clm_notification_rules: alert rules for contract lifecycle events
CREATE TABLE IF NOT EXISTS public.clm_notification_rules (
    id integer NOT NULL DEFAULT nextval('public.clm_notification_rules_id_seq'::regclass),
    name text NOT NULL,
    event text NOT NULL,
    recipients text NOT NULL DEFAULT '[]',
    channels text NOT NULL DEFAULT '["email"]',
    trigger_days_before integer,
    message_template text,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now()
);
CREATE SEQUENCE IF NOT EXISTS public.clm_notification_rules_id_seq AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
ALTER SEQUENCE public.clm_notification_rules_id_seq OWNED BY public.clm_notification_rules.id;

--
-- PostgreSQL database dump complete
--

\unrestrict C9kn5ndhhvea8oEwnOBqurdpTm7dIm5JxhpBk3M1VywZi3D7Vbmhu1et2tyurpi

