import Vue from 'vue';

import { required } from 'vuelidate/lib/validators';

import { setTypeahead } from '~/utils/typeahead';

import FormMixin from '~/shared/mixins/form';

import NamespacesService from '../services/namespaces';

const TYPEAHEAD_INPUT = '.remote .typeahead';

const { set } = Vue;

export default {
  template: '#js-new-namespace-form-tmpl',

  props: ['teamName'],

  mixins: [FormMixin],

  data() {
    return {
      namespace: {
        name: '',
        team: this.teamName || '',
      },
      timeout: {
        validate: null,
        team: null,
      },
      errors: {
        name: [],
      },
    };
  },

  methods: {
    onSubmit() {
      NamespacesService.save(this.namespace).then((response) => {
        const namespace = response.data;

        this.toggleForm();
        this.$v.$reset();
        set(this, 'namespace', {
          name: '',
          team: this.teamName || '',
        });

        this.$bus.$emit('namespaceCreated', namespace);
        this.$alert.$show(`Namespace '${namespace.name}' was created successfully`);
      }).catch((response) => {
        let errors = response.data;

        if (Array.isArray(errors)) {
          errors = errors.join('<br />');
        }

        this.$alert.$show(errors);
      });
    },
  },

  validations: {
    namespace: {
      name: {
        required,
        validate(value) {
          clearTimeout(this.timeout.validate);

          // required already taking care of this
          if (value === '') {
            return true;
          }

          return new Promise((resolve) => {
            const validate = () => {
              const promise = NamespacesService.validate(value);

              promise.then((data) => {
                set(this.errors, 'name', data.messages.name);
                resolve(data.valid);
              });
            };

            this.timeout.validate = setTimeout(validate, 1000);
          });
        },
      },
      team: {
        required,
        available(value) {
          clearTimeout(this.timeout.team);

          // required already taking care of this
          if (value === '') {
            return true;
          }

          return new Promise((resolve) => {
            const searchTeam = () => {
              const promise = NamespacesService.teamExists(value);

              promise.then((exists) => {
                // leave it for the back-end
                if (exists === null) {
                  resolve(true);
                }

                // if exists, valid
                resolve(exists);
              });
            };

            this.timeout.team = setTimeout(searchTeam, 1000);
          });
        },
      },
    },
  },

  mounted() {
    const $team = setTypeahead(TYPEAHEAD_INPUT, '/namespaces/typeahead/%QUERY');

    // workaround because of typeahead
    const updateTeam = () => {
      set(this.namespace, 'team', $team.val());
    };

    $team.on('typeahead:selected', updateTeam);
    $team.on('typeahead:autocompleted', updateTeam);
    $team.on('change', updateTeam);
  },
};
